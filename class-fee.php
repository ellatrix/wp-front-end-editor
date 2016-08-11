<?php

class FEE {
	const VERSION = '2.1.0';
	const WORDPRESS_MIN_VERSION = '4.5';
	const REST_API_PLUGIN_SLUG = 'rest-api';
	const REST_API_PLUGIN_URI = 'https://github.com/WP-API/WP-API';
	const REST_API_MIN_VERSION = '2.0-beta13.1';

	public $errors = array();

	function __construct() {
		add_action( 'init', array( $this, 'init' ) );
	}

	function error( $message ) {
		$this->errors[] = $message;
	}

	function admin_notices() {
		foreach ( $this->errors as $error ) {
			echo '<div class="error"><p>' . $error . '</p></div>';
		}
	}

	function check_wordpress_version() {
		include ABSPATH . WPINC . '/version.php';

		$wp_version = str_replace( '-src', '', $wp_version );

		if ( version_compare( $wp_version, self::WORDPRESS_MIN_VERSION, '<' ) ) {
			$this->error( '<strong>Front-end Editor</strong> requires WordPress version ' . self::WORDPRESS_MIN_VERSION . ' or higher.' );
		}
	}

	function check_rest_api_plugin() {
		require_once ABSPATH . 'wp-admin/includes/plugin.php';

		$plugins = get_plugins();
		$uris = wp_list_pluck( $plugins, 'PluginURI' );
		$file = array_search( self::REST_API_PLUGIN_URI, $uris );
		$installed = ! empty( $file );

		if ( $installed ) {
			$data = get_plugin_data( WP_PLUGIN_DIR . '/' . $file );

			if ( version_compare( $data['Version'], self::REST_API_MIN_VERSION, '<' ) ) {
				$link = wp_nonce_url( self_admin_url( 'update.php?action=upgrade-plugin&plugin=' . $file ), 'upgrade-plugin_' . $file );
				$this->error( '<strong>Front-end Editor</strong> requires the REST API version ' . self::REST_API_MIN_VERSION . '. <a href="' . $link . '">Update</a>.' );
			} else if ( ! is_plugin_active( $file ) ) {
				$link = wp_nonce_url( self_admin_url( 'plugins.php?action=activate&plugin=' . $file ), 'activate-plugin_' . $file );
				$this->error( '<strong>Front-end Editor</strong> requires the REST API to be active. <a href="' . $link . '">Activate</a>.' );
			}
		} else {
			$link = wp_nonce_url( self_admin_url( 'update.php?action=install-plugin&plugin=' . self::REST_API_PLUGIN_SLUG ), 'install-plugin_' . self::REST_API_PLUGIN_SLUG );
			$this->error( '<strong>Front-end Editor</strong> requires the REST API. <a href="' . $link . '">Install</a>.' );
		}
	}

	function init() {
		$this->check_wordpress_version();
		$this->check_rest_api_plugin();

		if ( $this->errors ) {
			return add_action( 'admin_notices', array( $this, 'admin_notices' ) );
		}

		add_post_type_support( 'post', 'front-end-editor' );
		add_post_type_support( 'page', 'front-end-editor' );

		add_action( 'wp_ajax_fee_nonce', array( $this, 'ajax_nonce' ) );
		add_action( 'wp_ajax_fee_thumbnail', array( $this, 'ajax_thumbnail' ) );

		add_action( 'wp_enqueue_scripts', array( $this, 'register_scripts' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
		add_action( 'wp', array( $this, 'wp' ) );

		add_action( 'rest_api_init', array( $this, 'rest_api_init' ) );
		add_filter( 'rest_pre_dispatch', array( $this, 'rest_reset_content_type' ), 10, 3 );
		add_filter( 'rest_dispatch_request', array( $this, 'rest_revision' ), 10, 3 );
	}

	function ajax_nonce() {
		echo wp_create_nonce( 'wp_rest' );
		die;
	}

	function ajax_thumbnail() {
		check_ajax_referer( 'update-post_' . $_POST['post_ID'] );

		if ( ! current_user_can( 'edit_post', $_POST['post_ID'] ) ) {
			wp_send_json_error( array( 'message' => __( 'You are not allowed to edit this item.' ) ) );
		}

		if ( $_POST['thumbnail_ID'] === '-1' ) {
			if ( delete_post_thumbnail( $_POST['post_ID'] ) ) {
				wp_send_json_success( '' );
			}
		} else if ( set_post_thumbnail( $_POST['post_ID'], $_POST['thumbnail_ID'] ) ) {
			wp_send_json_success( get_the_post_thumbnail( $_POST['post_ID'], $_POST['size'] ) );
		}

		die;
	}

	function api_request( $method = 'GET', $path = '', $query = array() ) {
		$request = new WP_REST_Request( $method, '/wp/v2' . $path );
		$request->set_query_params( $query );
		$data = rest_do_request( $request )->get_data();

		// We need HTML.
		if ( isset( $data['content'] ) && isset( $data['content']['raw'] ) ) {
			$data['content']['raw'] = wpautop( $data['content']['raw'] );
		}

		return $data;
	}

	function register_scripts() {
		global $post;

		wp_register_script( 'fee-tinymce', plugins_url( 'vendor/tinymce.js', __FILE__ ), array(), self::VERSION, true );
		wp_register_script( 'fee-tinymce-lists', plugins_url( 'vendor/lists.js', __FILE__ ), array( 'fee-tinymce' ), self::VERSION, true );
		wp_register_script( 'fee-tinymce-paste', plugins_url( 'vendor/paste.js', __FILE__ ), array( 'fee-tinymce' ), self::VERSION, true );
		wp_register_script( 'fee-tinymce-wordpress', plugins_url( 'vendor/wordpress.js', __FILE__ ), array( 'fee-tinymce' ), self::VERSION, true );
		wp_register_script( 'fee-tinymce-wplink', plugins_url( 'vendor/wplink.js', __FILE__ ), array( 'fee-tinymce' ), self::VERSION, true );
		wp_register_script( 'fee-tinymce-wptextpattern', plugins_url( 'vendor/wptextpattern.js', __FILE__ ), array( 'fee-tinymce' ), self::VERSION, true );
		wp_register_script( 'fee-tinymce-wpview', plugins_url( 'vendor/wpview.js', __FILE__ ), array( 'fee-tinymce', 'fee-mce-view' ), self::VERSION, true );
		wp_register_script( 'fee-mce-view', plugins_url( 'vendor/mce-view.js', __FILE__ ), array( 'shortcode', 'jquery', 'media-views', 'media-audiovideo' ), self::VERSION, true );
		wp_register_script( 'fee-tinymce-image', plugins_url( 'js/tinymce.image.js', __FILE__ ), array( 'fee-tinymce' ), self::VERSION, true );
		wp_register_script( 'fee-tinymce-theme', plugins_url( 'js/tinymce.theme.js', __FILE__ ), array( 'fee-tinymce', 'underscore' ), self::VERSION, true );

		$tinymce = array(
			'plugins' => implode( ' ', array_unique( apply_filters( 'fee_tinymce_plugins', array(
				'wordpress',
				'feeImage',
				'wptextpattern',
				'wplink',
				'wpview',
				'paste',
				'lists'
			) ) ) ),
			'toolbar' => apply_filters( 'fee_tinymce_toolbar', array(
				'bold',
				'italic',
				'strikethrough',
				'link'
			) ),
			'theme' => 'fee',
			'inline' => true,
			'relative_urls' => false,
			'convert_urls' => false,
			'browser_spellcheck' => true,
			'wpeditimage_html5_captions' => current_theme_supports( 'html5', 'caption' ),
			'end_container_on_empty_block' => true
		);

		wp_register_script( 'fee', plugins_url( '/js/fee.js', __FILE__ ), array(
			'fee-tinymce',
			'fee-tinymce-lists',
			'fee-tinymce-paste',
			'fee-tinymce-wordpress',
			'fee-tinymce-wplink',
			'fee-tinymce-wptextpattern',
			'fee-tinymce-wpview',
			'fee-tinymce-image',
			'fee-tinymce-theme',
			'media-views',
			'jquery',
			'underscore',
			'backbone'
		), self::VERSION, true );
		wp_localize_script( 'fee', 'feeData', array(
			'tinymce' => apply_filters( 'fee_tinymce_config', $tinymce ),
			'post' => $this->api_request( 'GET', '/' . $this->get_rest_endpoint() . '/' . $post->ID, array( 'context' => 'edit' ) ),
			'autosave' => $this->api_request( 'GET', '/' . $this->get_rest_endpoint() . '/' . $post->ID . '/autosave' ),
			'titlePlaceholder' => apply_filters( 'enter_title_here', __( 'Enter title here' ), $post ),
			'editURL' => get_edit_post_link(),
			'ajaxURL' => admin_url( 'admin-ajax.php' ),
			'api' => array(
				'endpoint' => $this->get_rest_endpoint(),
				'nonce' => wp_create_nonce( 'wp_rest' ),
				'root' => esc_url_raw( get_rest_url() )
			)
		) );

		wp_register_script( 'fee-adminbar', plugins_url( '/js/fee-adminbar.js', __FILE__ ), array( 'wp-util' ), self::VERSION, true );
		wp_localize_script( 'fee-adminbar', 'fee_adminbar', array(
			'postTypes' => $this->get_post_types(),
			'postNew' => admin_url( 'post-new.php' ),
			'api' => array(
				'nonce' => wp_create_nonce( 'wp_rest' ),
				'root' => esc_url_raw( get_rest_url() )
			)
		) );

		wp_register_style( 'fee-tinymce-core' , plugins_url( 'css/tinymce.core.css', __FILE__ ), array(), self::VERSION, 'screen' );
		wp_register_style( 'fee-tinymce-view' , plugins_url( 'css/tinymce.view.css', __FILE__ ), array(), self::VERSION, 'screen' );
		wp_register_style( 'fee' , plugins_url( 'css/fee.css', __FILE__ ), array( 'fee-tinymce-core', 'fee-tinymce-view', 'dashicons' ), self::VERSION, 'screen' );

		wp_add_inline_style( 'fee', '@media print{.fee-no-print{display:none}}' );
	}

	function enqueue_scripts() {
		global $post;

		if ( $this->has_fee() ) {
			wp_enqueue_style( 'fee' );
			wp_enqueue_script( 'fee' );
			wp_enqueue_media( array( 'post' => $post ) );
		}

		if ( current_user_can( 'edit_posts' ) ) {
			wp_enqueue_script( 'fee-adminbar' );
		}
	}

	function wp() {
		global $post;

		if ( ! $this->has_fee() ) {
			return;
		}

		add_filter( 'the_title', array( $this, 'the_title' ), 10, 2 );
		add_filter( 'the_content', array( $this, 'the_content' ), 20 );
		add_filter( 'wp_link_pages', array( $this, 'wp_link_pages' ) );
		add_filter( 'post_thumbnail_html', array( $this, 'post_thumbnail_html' ), 10, 5 );
		add_filter( 'get_post_metadata', array( $this, 'get_post_metadata' ), 10, 4 );
		add_filter( 'private_title_format', array( $this, 'private_title_format' ), 10, 2 );
		add_filter( 'protected_title_format', array( $this, 'private_title_format' ), 10, 2 );
	}

	function the_title( $title, $id ) {
		if (
			is_main_query() &&
			$id === get_queried_object_id() &&
			$this->did_action( 'wp_head' )
		) {
			$title .= '<br class="fee-title" />';
		}

		return $title;
	}

	function the_content( $content ) {
		if (
			is_main_query() &&
			in_the_loop() &&
			$this->did_action( 'wp_head' )
		) {
			$content = '<div class="fee-content">' . $content . '</div>';
		}

		return $content;
	}

	function wp_link_pages( $html ) {
		return '<div class="fee-link-pages">' . $html . '</div>';
	}

	function post_thumbnail_html( $html, $post_id, $post_thumbnail_id, $size, $attr ) {
		if (
			is_main_query() &&
			in_the_loop() &&
			get_queried_object_id() === $post_id &&
			$this->did_action( 'wp_head' )
		) {
			$html = '<div class="fee-thumbnail" data-fee-size="' . esc_attr( $size ) . '">' . $html . '</div>';
		}

		return $html;
	}

	// Not sure if this is a good idea, this could have unexpected consequences. But otherwise nothing shows up if the featured image is set in edit mode.
	function get_post_metadata( $n, $object_id, $meta_key, $single ) {
		static $lock;

		if (
			is_main_query() &&
			in_the_loop() &&
			get_queried_object_id() === $object_id &&
			$this->did_action( 'wp_head' ) &&
			$meta_key === '_thumbnail_id' &&
			$single &&
			empty( $lock )
		) {
			$lock = true;
			$thumbnail_id = get_post_thumbnail_id( $object_id );
			$lock = false;

			if ( $thumbnail_id ) {
				return $thumbnail_id;
			}

			return true;
		}
	}

	function private_title_format( $title, $post ) {
		if ( $post->ID === get_queried_object_id() ) {
			$title = '%s';
		}

		return $title;
	}

	function supports_fee( $id = null ) {
		$post = get_post( $id );

		if ( ! $post ) return false;

		$post_type_object = get_post_type_object( $post->post_type );

		if (
			$post->ID !== (int) get_option( 'page_for_posts' ) &&
			$post_type_object->show_in_rest &&
			post_type_supports( $post->post_type, 'front-end-editor' ) &&
			current_user_can( 'edit_post', $post->ID )
		) {
			return apply_filters( 'supports_fee', true, $post );
		}

		return false;
	}

	function has_fee() {
		return $this->supports_fee() && is_singular();
	}

	function get_post_types() {
		$post_types = get_post_types( array( 'show_in_rest' => true ), 'objects' );

		foreach ( $post_types as $key => $value ) {
			$post_types[ $key ] = empty( $post_types[ $key ] ) ? $key : $post_types[ $key ]->rest_base;
		}

		return array_intersect_key( $post_types, array_flip( get_post_types_by_support( 'front-end-editor' ) ) );
	}

	function did_action( $tag ) {
		return did_action( $tag ) - (int) doing_filter( $tag );
	}

	function rest_api_init() {
		if ( ! class_exists( 'WP_REST_Post_Autosave_Controller' ) ) {
			require_once 'class-wp-rest-post-autosave-controller.php';

			foreach ( get_post_types( array( 'show_in_rest' => true ), 'objects' ) as $post_type ) {
				$autosave_controller = new WP_REST_Post_Autosave_Controller( $post_type->name );
				$autosave_controller->register_routes();
			}
		}
	}

	function rest_reset_content_type( $result, $server, $request ) {
		$content_type = $request->get_content_type();

		if ( ! empty( $content_type ) && 'text/plain' === $content_type['value'] ) {
			$request->set_header( 'content-type', 'application/json' );
		}
	}

	function rest_revision( $result, $request ) {
		if ( empty( $request['id'] ) || empty( $request['_fee_session'] ) ) {
			return;
		}

		$session = (int) get_post_meta( $request['id'], '_fee_session', true );

		if ( $session !== $request['_fee_session'] ) {
			wp_save_post_revision( $request['id'] );
		}

		remove_action( 'post_updated', 'wp_save_post_revision', 10 );

		update_post_meta( $request['id'], '_fee_session', $request['_fee_session'] );
	}

	function get_rest_endpoint( $id = null ) {
		$post = get_post( $id );

		if ( ! $post ) return;

		$object = get_post_type_object( $post->post_type );

		return empty( $object->rest_base ) ? $object->name : $object->rest_base;
	}
}
