<?php

class FEE {
	const VERSION = '2.0.0-alpha';
	const WORDPRESS_MIN_VERSION = '4.5';
	const REST_API_PLUGIN_SLUG = 'rest-api';
	const REST_API_PLUGIN_URI = 'https://github.com/WP-API/WP-API';
	const REST_API_MIN_VERSION = '2.0-beta12';

	public $errors = array();

	private $fee;

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
		global $wp_post_statuses;

		$this->check_wordpress_version();
		$this->check_rest_api_plugin();

		if ( $this->errors ) {
			return add_action( 'admin_notices', array( $this, 'admin_notices' ) );
		}

		add_post_type_support( 'post', 'front-end-editor' );
		add_post_type_support( 'page', 'front-end-editor' );

		// Lets auto-drafts pass as drafts by WP_Query.
		$wp_post_statuses['auto-draft']->protected = true;

		add_action( 'wp_ajax_fee_new', array( $this, 'ajax_new' ) );
		add_action( 'wp_ajax_fee_shortcode', array( $this, 'ajax_shortcode' ) );
		add_action( 'wp_ajax_fee_thumbnail', array( $this, 'ajax_thumbnail' ) );

		add_action( 'wp_enqueue_scripts', array( $this, 'register_scripts' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
		add_action( 'wp', array( $this, 'wp' ) );

		add_filter( 'heartbeat_send', array( $this, 'heartbeat_send' ) );
		add_action( 'rest_api_init', array( $this, 'rest_api_init' ) );
	}

	function ajax_new() {
		check_ajax_referer( 'fee-new', 'nonce' );

		require_once( ABSPATH . '/wp-admin/includes/post.php' );

		$post = get_default_post_to_edit( isset( $_POST['post_type'] ) ? $_POST['post_type'] : 'post', true );
		wp_set_post_categories( $post->ID, array( get_option( 'default_category' ) ) );

		wp_send_json_success( get_permalink( $post->ID ) );
	}

	function ajax_shortcode() {
		global $post;

		$post = get_post( $_POST['post_ID'] );

		setup_postdata( $post );

		wp_send_json_success( do_shortcode( wp_unslash( $_POST['shortcode'] ) ) );
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
		$server = rest_get_server();
		$request = new WP_REST_Request( $method, '/wp/v2' . $path );
		$request->set_query_params( $query );
		$response = $server->dispatch( $request );
		$data = $response->get_data();

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
		wp_register_script( 'fee-tinymce-wpview', plugins_url( 'vendor/wpview.js', __FILE__ ), array( 'fee-tinymce', 'fee-mce-view-register' ), self::VERSION, true );
		wp_register_script( 'fee-mce-view', plugins_url( 'vendor/mce-view.js', __FILE__ ), array( 'shortcode', 'jquery', 'media-views', 'media-audiovideo' ), self::VERSION, true );
		wp_register_script( 'fee-mce-view-register', plugins_url( 'js/mce-view-register.js', __FILE__ ), array( 'fee-mce-view' ), self::VERSION, true );
		wp_localize_script( 'fee-mce-view-register', 'mce_view_register', array( 'post_id' => $post->ID ) );
		wp_register_script( 'fee-tinymce-image', plugins_url( 'js/tinymce.image.js', __FILE__ ), array( 'fee-tinymce' ), self::VERSION, true );
		wp_register_script( 'fee-tinymce-theme', plugins_url( 'js/tinymce.theme.js', __FILE__ ), array( 'fee-tinymce' ), self::VERSION, true );

		// overwrite for now
		wp_localize_script( 'wp-api', 'wpApiSettings', array(
			'root' => esc_url_raw( get_rest_url() ),
			'nonce' => wp_create_nonce( 'wp_rest' ),
			'versionString' => 'wp/v2/',
			'schema' => $this->api_request(),
			'cacheSchema' => true
		) );

		$tinymce = array(
			'selector' => '.fee-content',
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
			'placeholder' => apply_filters( 'fee_content_placeholder', __( 'Just write…' ) ),
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
			'heartbeat',
			'wp-api',
			'media-views',
			'jquery',
			'underscore'
		), self::VERSION, true );
		wp_localize_script( 'fee', 'feeData', array(
			'tinymce' => apply_filters( 'fee_tinymce_config', $tinymce ),
			'post' => $this->api_request( 'GET', '/' . ( $post->post_type === 'page' ? 'pages' : 'posts' ) . '/' . $post->ID, array( 'context' => 'edit' ) ),
			'titlePlaceholder' => apply_filters( 'enter_title_here', __( 'Enter title here' ), $post ),
			'editURL' => get_edit_post_link()
		) );

		wp_register_script( 'fee-adminbar', plugins_url( '/js/fee-adminbar.js', __FILE__ ), array( 'wp-util' ), self::VERSION, true );
		wp_localize_script( 'fee-adminbar', 'fee_adminbar', array(
			'supportedPostTypes' => $this->get_supported_post_types(),
			'postNew' => admin_url( 'post-new.php' ),
			'nonce' => wp_create_nonce( 'fee-new' )
		) );

		wp_register_style( 'fee-tinymce-core' , plugins_url( 'css/tinymce.core.css', __FILE__ ), array(), self::VERSION, 'screen' );
		wp_register_style( 'fee-tinymce-view' , plugins_url( 'css/tinymce.view.css', __FILE__ ), array(), self::VERSION, 'screen' );
		wp_register_style( 'fee' , plugins_url( 'css/fee.css', __FILE__ ), array( 'fee-tinymce-core', 'fee-tinymce-view', 'dashicons' ), self::VERSION, 'screen' );
	}

	function enqueue_scripts() {
		global $post;

		if ( $this->has_fee() ) {
			wp_enqueue_style( 'wp-auth-check' );
			wp_enqueue_script( 'wp-auth-check' );
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

		if ( force_ssl_admin() && ! is_ssl() ) {
			wp_redirect( set_url_scheme( get_permalink( $post->ID ), 'https' ) );

			die;
		}

		if ( $post->post_status === 'auto-draft' ) {
			$post->post_title = '';
			$post->comment_status = get_option( 'default_comment_status' );
			$post->ping_status = get_option( 'default_ping_status' );
		}

		require_once( ABSPATH . '/wp-admin/includes/admin.php' );

		add_filter( 'body_class', array( $this, 'body_class' ) );
		add_filter( 'post_class', array( $this, 'post_class' ) );
		add_filter( 'the_title', array( $this, 'the_title' ), 10, 2 );
		add_filter( 'the_content', array( $this, 'the_content' ), 20 );
		add_filter( 'wp_link_pages', array( $this, 'wp_link_pages' ) );
		add_filter( 'post_thumbnail_html', array( $this, 'post_thumbnail_html' ), 10, 5 );
		add_filter( 'get_post_metadata', array( $this, 'get_post_metadata' ), 10, 4 );
		add_filter( 'private_title_format', array( $this, 'private_title_format' ), 10, 2 );
		add_filter( 'protected_title_format', array( $this, 'private_title_format' ), 10, 2 );

		add_action( 'wp_print_footer_scripts', 'wp_auth_check_html' );
	}

	function body_class( $classes ) {
		$classes[] = 'fee fee-off';

		return $classes;
	}

	function post_class( $classes ) {
		$classes[] = 'fee-post';

		return $classes;
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
		if (
			is_main_query() &&
			in_the_loop() &&
			get_queried_object_id() === $object_id &&
			$this->did_action( 'wp_head' ) &&
			$meta_key === '_thumbnail_id' &&
			$single &&
			empty( $this->fee['filtering_get_post_metadata'] )
		) {
			$this->fee['filtering_get_post_metadata'] = true;

			$thumbnail_id = get_post_thumbnail_id( $object_id );

			$this->fee['filtering_get_post_metadata'] = false;

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

	function get_autosave_notice() {
		global $post;

		if ( 'auto-draft' == $post->post_status ) {
			$autosave = false;
		} else {
			$autosave = wp_get_post_autosave( $post->ID );
		}

		// Detect if there exists an autosave newer than the post and if that autosave is different than the post
		if ( $autosave && mysql2date( 'U', $autosave->post_modified_gmt, false ) > mysql2date( 'U', $post->post_modified_gmt, false ) ) {
			foreach ( _wp_post_revision_fields() as $autosave_field => $_autosave_field ) {
				if ( normalize_whitespace( $autosave->$autosave_field ) !== normalize_whitespace( $post->$autosave_field ) ) {
					return sprintf( __( 'There is an autosave of this post that is more recent than the version below. <a href="%s">View the autosave</a>' ), get_edit_post_link( $autosave->ID ) );
				}
			}

			// If this autosave isn't different from the current post, begone.
			wp_delete_post_revision( $autosave->ID );
		}

		return false;
	}

	function supports_fee( $id = null ) {
		$post = get_post( $id );
		$supports_fee = false;

		if (
			$post &&
			post_type_supports( $post->post_type, 'front-end-editor' ) &&
			current_user_can( 'edit_post', $post->ID ) &&
			$post->ID !== (int) get_option( 'page_for_posts' )
		) {
			$supports_fee = true;
		}

		return apply_filters( 'supports_fee', $supports_fee, $post );
	}

	function has_fee() {
		return $this->supports_fee() && is_singular();
	}

	function get_supported_post_types() {
		global $_wp_post_type_features;

		$post_types = array();

		foreach ( $_wp_post_type_features as $post_type => $features ) {
			if ( array_key_exists( 'front-end-editor', $features ) ) {
				$post_types;
				array_push( $post_types, $post_type );
			}
		}

		return $post_types;
	}

	function did_action( $tag ) {
		return did_action( $tag ) - (int) doing_filter( $tag );
	}

	function heartbeat_send( $response ) {
		$response['fee_nonces'] = array(
			'api' => wp_create_nonce( 'wp_rest' ),
			'heartbeat' => wp_create_nonce( 'heartbeat-nonce' )
		);

		return $response;
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
}
