<?php

class FEE {
	const VERSION = '1.1.0';
	const WORDPRESS_MIN_VERSION = '4.5';
	const TINYMCE_VERSION = '4.4';
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

		add_filter( 'get_edit_post_link', array( $this, 'get_edit_post_link' ), 10, 3 );

		add_action( 'wp_ajax_fee_new', array( $this, 'ajax_new' ) );
		add_action( 'wp_ajax_fee_shortcode', array( $this, 'ajax_shortcode' ) );
		add_action( 'wp_ajax_fee_thumbnail', array( $this, 'ajax_thumbnail' ) );

		add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ) );
		add_action( 'wp', array( $this, 'wp' ) );
	}

	function get_edit_post_link( $link, $id, $context ) {
		return $this->supports_fee( $id ) && ! is_admin() ? $this->edit_link( $id ) : $link;
	}

	function ajax_new() {
		check_ajax_referer( 'fee-new', 'nonce' );

		require_once( ABSPATH . '/wp-admin/includes/post.php' );

		$post = get_default_post_to_edit( isset( $_POST['post_type'] ) ? $_POST['post_type'] : 'post', true );
		wp_set_post_categories( $post->ID, array( get_option( 'default_category' ) ) );

		wp_send_json_success( $this->edit_link( $post->ID ) );
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

	function wp_enqueue_scripts() {
		global $post;

		if ( $this->has_fee() ) {
			wp_enqueue_style( 'wp-core-ui' , $this->url( '/css/wp-core-ui.css' ), false, self::VERSION, 'screen' );
			wp_enqueue_style( 'wp-core-ui-colors' , $this->url( '/css/wp-core-ui-colors.css' ), false, self::VERSION, 'screen' );

			wp_enqueue_style( 'wp-auth-check' );
			wp_enqueue_script( 'wp-auth-check' );

			wp_enqueue_script( 'autosave-custom', $this->url( '/js/autosave.js' ), array( 'schedule', 'wp-ajax-response', 'fee' ), self::VERSION, true );
			wp_localize_script( 'autosave-custom', 'autosaveL10n', array(
				'autosaveInterval' => AUTOSAVE_INTERVAL,
				'blog_id' => get_current_blog_id()
			) );

			wp_enqueue_script( 'fee-tinymce', $this->url( '/modules/tinymce/tinymce.js' ), array(), self::TINYMCE_VERSION, true );
			wp_enqueue_script( 'fee-tinymce-image', $this->url( '/js/tinymce.image.js' ), array( 'fee-tinymce' ), self::VERSION, true );
			wp_enqueue_script( 'fee-tinymce-insert', $this->url( '/js/tinymce.insert.js' ), array( 'fee-tinymce' ), self::VERSION, true );
			wp_enqueue_script( 'fee-tinymce-view', $this->url( '/modules/wordpress/wp-includes/js/tinymce/plugins/wpview/plugin.min.js' ), array( 'fee-tinymce' ), self::VERSION, true );
			wp_enqueue_script( 'fee-tinymce-theme', $this->url( '/js/tinymce.theme.js' ), array( 'fee-tinymce' ), self::VERSION, true );
			wp_enqueue_script( 'fee-tinymce-wordpress', $this->url( '/modules/wordpress/wp-includes/js/tinymce/plugins/wordpress/plugin.min.js' ), array( 'fee-tinymce' ), self::VERSION, true );
			wp_enqueue_script( 'fee-tinymce-wplink', $this->url( '/modules/wordpress/wp-includes/js/tinymce/plugins/wplink/plugin.min.js' ), array( 'fee-tinymce' ), self::VERSION, true );
			wp_enqueue_script( 'fee-tinymce-wptextpattern', $this->url( '/modules/wordpress/wp-includes/js/tinymce/plugins/wptextpattern/plugin.min.js' ), array( 'fee-tinymce' ), self::VERSION, true );

			$tinymce_plugins = array(
				'wordpress',
				'feeImage',
				'wptextpattern',
				'wplink',
				'wpview',
				'paste',
				'insert',
				'lists'
			);

			$tinymce_toolbar = array(
				'bold',
				'italic',
				'strikethrough',
				'link'
			);

			$tinymce = array(
				'selector' => '#fee-mce-' . $post->ID,
				'plugins' => implode( ' ', array_unique( apply_filters( 'fee_tinymce_plugins', $tinymce_plugins ) ) ),
				'toolbar' => apply_filters( 'fee_tinymce_toolbar', $tinymce_toolbar ),
				'theme' => 'fee',
				'inline' => true,
				'relative_urls' => false,
				'convert_urls' => false,
				'browser_spellcheck' => true,
				'placeholder' => apply_filters( 'fee_content_placeholder', __( 'Just write…' ) ),
				'wpeditimage_html5_captions' => current_theme_supports( 'html5', 'caption' ),
				'end_container_on_empty_block' => true
			);

			$server = rest_get_server();

			$request = new WP_REST_Request( 'GET', '/wp/v2/' . ( $post->post_type === 'page' ? 'pages' : 'posts' ) . '/' . $post->ID );
			$request->set_query_params( array(
				'context' => 'edit'
			) );

			$result = $server->dispatch( $request );

			wp_enqueue_script( 'fee', $this->url( '/js/fee.js' ), array( 'fee-tinymce', 'wp-util', 'heartbeat', 'editor', 'wp-api' ), self::VERSION, true );
			wp_localize_script( 'fee', 'fee', array(
				'tinymce' => apply_filters( 'fee_tinymce_config', $tinymce ),
				'post' => $result->get_data(),
				'nonces' => array(
					'post' => wp_create_nonce( 'update-post_' . $post->ID )
				),
				'lock' => ! wp_check_post_lock( $post->ID ) ? implode( ':', wp_set_post_lock( $post->ID ) ) : false,
				'notices' => array(
					'autosave' => $this->get_autosave_notice()
				)
			) );

			wp_localize_script( 'fee', 'feeL10n', array(
				'saveAlert' => __( 'The changes you made will be lost if you navigate away from this page.' ),
				'title' => apply_filters( 'fee_title_placeholder', __( 'Title' ) )
			) );

			wp_enqueue_media( array( 'post' => $post ) );

			wp_deregister_script( 'mce-view' );
			wp_enqueue_script( 'mce-view', $this->url( '/modules/wordpress/wp-includes/js/mce-view.min.js' ), array( 'shortcode', 'jquery', 'media-views', 'media-audiovideo' ), self::VERSION, true );

			wp_enqueue_script( 'mce-view-register', $this->url( '/js/mce-view-register.js' ), array( 'mce-view', 'fee' ), self::VERSION, true );
			wp_localize_script( 'mce-view-register', 'mce_view_register', array(
				'post_id' => $post->ID
			) );

			wp_enqueue_style( 'tinymce-core' , $this->url( '/css/tinymce.core.css' ), false, self::VERSION, 'screen' );
			wp_enqueue_style( 'tinymce-view' , $this->url( '/css/tinymce.view.css' ), false, self::VERSION, 'screen' );
			wp_enqueue_style( 'fee' , $this->url( '/css/fee.css' ), false, self::VERSION, 'screen' );
			wp_enqueue_style( 'dashicons' );
		}

		if ( current_user_can( 'edit_posts' ) ) {
			if ( is_singular() ) {
				require_once( ABSPATH . '/wp-admin/includes/post.php' );

				$user_id = wp_check_post_lock( $post->ID );
				$user = get_userdata( $user_id );
			}

			wp_enqueue_style( 'fee-adminbar', $this->url( '/css/fee-adminbar.css' ), false, self::VERSION, 'screen' );
			wp_enqueue_script( 'fee-adminbar', $this->url( '/js/fee-adminbar.js' ), array( 'wp-util', 'wp-api' ), self::VERSION, true );
			wp_localize_script( 'fee-adminbar', 'fee_adminbar', array(
				'lock' => ( is_singular() && $user_id ) ? $user->display_name : false,
				'supportedPostTypes' => $this->get_supported_post_types(),
				'postNew' => admin_url( 'post-new.php' ),
				'nonce' => wp_create_nonce( 'fee-new' )
			) );
		}
	}

	function wp() {
		global $post;

		if ( ! empty( $_GET['get-post-lock'] ) ) {
			require_once( ABSPATH . '/wp-admin/includes/post.php' );

			wp_set_post_lock( $post->ID );

			wp_redirect( $this->edit_link( $post->ID ) );

			die;
		}

		if ( ! $this->has_fee() ) {
			return;
		}

		if ( force_ssl_admin() && ! is_ssl() ) {
			wp_redirect( set_url_scheme( $this->edit_link( $post->ID ), 'https' ) );

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

		add_action( 'wp_before_admin_bar_render', array( $this, 'wp_before_admin_bar_render' ) );

		add_action( 'wp_print_footer_scripts', 'wp_auth_check_html' );

		if ( count( get_users( array( 'fields' => 'ID', 'number' => 2 ) ) ) > 1 ) {
			add_action( 'wp_print_footer_scripts', '_admin_notice_post_locked' );
		}

		add_filter( 'fee_content', 'wptexturize' );
		add_filter( 'fee_content', 'convert_chars' );
		add_filter( 'fee_content', 'wpautop' );
	}

	function body_class( $classes ) {
		global $post;

		$classes[] = 'fee fee-off';

		require_once( ABSPATH . '/wp-admin/includes/post.php' );

		if ( wp_check_post_lock( $post->ID ) ) {
			$classes[] = 'fee-locked';
		}

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
		global $post;

		if (
			is_main_query() &&
			in_the_loop() &&
			$this->did_action( 'wp_head' )
		) {
			return (
				'<div id="fee-content-' . $post->ID . '" class="fee-content">' .
					'<div class="fee-content-original">' .
						$content .
					'</div>' .
					'<div id="fee-mce-' . $post->ID . '" class="fee-content-body">' .
						apply_filters( 'fee_content', $post->post_content ) .
					'</div>' .
				'</div>'
			);
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
			return (
				'<div class="fee-thumbnail' . ( empty( $html ) ? ' fee-empty' : '' ) . '" data-size="' . esc_attr( $size ) . '">' .
					'<div class="fee-thumbnail-wrap">' .
						$html .
					'</div>' .
					'<div class="fee-thumbnail-toolbar wp-core-ui">' .
						'<div class="fee-edit-thumbnail dashicons dashicons-edit"></div>' .
						'<div class="fee-remove-thumbnail dashicons dashicons-no-alt"></div>' .
					'</div>' .
					'<div class="fee-insert-thumbnail wp-core-ui"><span class="dashicons dashicons-plus-alt"></span> ' . __( 'Add a featured image' ) . '</div>' .
				'</div>'
			);
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

	function wp_before_admin_bar_render() {
		global $wp_admin_bar, $wp_the_query;

		$current_object = $wp_the_query->get_queried_object();

		if ( empty( $current_object ) )
			return;

		if (
			! empty( $current_object->post_type ) &&
			( $post_type_object = get_post_type_object( $current_object->post_type ) ) &&
			current_user_can( 'edit_post', $current_object->ID ) &&
			$post_type_object->show_ui &&
			$post_type_object->show_in_admin_bar
		) {
			$wp_admin_bar->remove_node( 'edit' );

			$wp_admin_bar->add_node( array(
				'id' => 'edit',
				'title' => $post_type_object->labels->edit_item,
				'href' => '#edit'
			) );

			$wp_admin_bar->add_node( array(
				'parent' => 'edit',
				'id' => 'edit-save',
				'title' => __( 'Save Draft' ),
				'href' => '#'
			) );

			$wp_admin_bar->add_node( array(
				'parent' => 'edit',
				'id' => 'edit-publish',
				'title' => __( 'Publish' ),
				'href' => '#'
			) );

			$wp_admin_bar->add_node( array(
				'parent' => 'edit',
				'id' => 'edit-cancel',
				'title' => __( 'Cancel' ),
				'href' => get_edit_post_link( $current_object->ID )
			) );

			remove_filter( 'get_edit_post_link', array( $this, 'get_edit_post_link' ), 10, 3 );

			$wp_admin_bar->add_node( array(
				'parent' => 'edit',
				'id' => 'edit-in-admin',
				'title' => __( 'Edit in admin' ),
				'href' => get_edit_post_link( $current_object->ID )
			) );

			add_filter( 'get_edit_post_link', array( $this, 'get_edit_post_link' ), 10, 3 );
		}
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

	function url( $path ) {
		$url = plugin_dir_url( __FILE__ );

		if ( is_string( $path ) ) {
			$url .= ltrim( $path, '/' );
		}

		return $url;
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

	function edit_link( $id ) {
		if ( get_queried_object_id() === $id ) {
			return '#fee-edit-link';
		}

		return get_permalink( $id ) . '#edit';
	}
}
