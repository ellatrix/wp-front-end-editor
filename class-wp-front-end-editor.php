<?php

class WP_Front_End_Editor {

	public $version = '0.6.1';
	public $plugin = 'wp-front-end-editor/wp-front-end-editor.php';

	private static $instance;

	private function url( $path ) {

		$url = plugin_dir_url( __FILE__ );

		if ( is_string( $path ) )

			$url .= ltrim( $path, '/' );

		return $url;

	}

	private function response( $response ) {

		echo $response;

		die();

	}

	public static function is_edit() {

		global $wp_query;

		if ( ! is_singular() )

			return false;

		if ( is_front_page()
			&& isset( $_GET['editing'] ) )

			return true;

		if ( isset( $wp_query->query_vars['edit'] ) )

			return true;

		return false;

	}

	public static function edit_link( $id ) {

		$post = get_post( $id );

		if ( ! $post )

			return;

		if ( $id == get_option( 'page_on_front' ) )

			return home_url( '?editing' );

		$permalink = get_permalink( $post->ID );

		if ( strpos( $permalink, '?' ) !== false )

			return add_query_arg( 'edit', '', $permalink );

		if ( trailingslashit( $permalink ) === $permalink )

			return trailingslashit( $permalink . 'edit' );

		return trailingslashit( $permalink ) . 'edit';

	}
	
	public static function instance() {

		if ( ! self::$instance )

			self::$instance = new self;

		return self::$instance;

	}

	private function __construct() {

		global $wp_version;

		if ( empty( $wp_version )
			|| version_compare( $wp_version, '3.8', '<' )
			|| version_compare( $wp_version, '3.9-alpha', '>' ) ) {

			add_action( 'admin_notices', array( $this, 'admin_notices' ) );

			return;

		}

		register_activation_hook( $this->plugin, array( $this, 'activate' ) );

		add_action( 'after_setup_theme', array( $this, 'after_setup_theme' ) ); // temporary
		add_action( 'init', array( $this, 'init' ) );

	}

	public function admin_notices() {

		echo '<div class="error"><p><strong>WordPress Front-end Editor</strong> currently only works between versions 3.8 and 3.9-alpha.</p></div>';

	}

	public function activate() {

		add_rewrite_endpoint( 'edit', EP_PERMALINK | EP_PAGES );

		flush_rewrite_rules();

	}

	public function after_setup_theme() {

		add_theme_support( 'front-end-editor' );

	}

	public function init() {

		global $pagenow, $wp_post_statuses;

		if ( ! current_theme_supports( 'front-end-editor' ) )

			return;

		// Lets auto-drafts pass as drafts by WP_Query.
		$wp_post_statuses['auto-draft']->protected = true;

		add_rewrite_endpoint( 'edit', EP_PERMALINK | EP_PAGES );

		add_action( 'wp', array( $this, 'wp' ) );

		if ( is_admin()
			&& ( $pagenow === 'post.php'
				|| $pagenow === 'post-new.php' ) )

			add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );

		if ( isset( $_POST['wp_fee_redirect'] )
			&& $_POST['wp_fee_redirect'] == '1' )

			add_filter( 'redirect_post_location', array( $this, 'redirect_post_location' ), 10, 2 );

		add_filter( 'admin_post_thumbnail_html', array( $this, 'admin_post_thumbnail_html' ), 10, 2 );

		add_action( 'wp_ajax_wp_fee_post', array( $this, 'wp_fee_post' ) );
		add_action( 'wp_ajax_wp_fee_shortcode', array( $this, 'wp_fee_shortcode' ) );
		add_action( 'wp_ajax_wp_fee_embed', array( $this, 'wp_fee_embed' ) );
		add_action( 'wp_ajax_wp_fee_new', array( $this, 'wp_fee_new' ) );

	}

	public function wp() {

		global $post;

		add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ) );

		add_filter( 'get_edit_post_link', array( $this, 'get_edit_post_link' ), 10, 3 );
		add_filter( 'edit_post_link', array( $this, 'edit_post_link' ), 10, 2 );

		if ( ! $this->is_edit() )

			return;

		if ( ! $post )

			wp_die( __( 'You attempted to edit an item that doesn&#8217;t exist. Perhaps it was deleted?' ) );

		if ( ! current_user_can( 'edit_post', $post->ID ) )

			wp_die( __( 'You are not allowed to edit this item.' ) );

		if ( $post->post_status === 'auto-draft' )

			$post->post_title = '';

		add_filter( 'show_admin_bar', '__return_true' );

		add_action( 'wp_print_footer_scripts', 'wp_auth_check_html' );
		add_action( 'admin_bar_menu', array( $this, 'admin_bar_menu' ), 10 );
		add_action( 'wp_before_admin_bar_render', array( $this, 'wp_before_admin_bar_render' ), 100 );

		add_filter( 'the_title', array( $this, 'the_title' ), 20, 2 );
		add_filter( 'the_content', array( $this, 'the_content' ), 20 );
		add_filter( 'wp_link_pages', '__return_empty_string', 20 );
		add_filter( 'post_thumbnail_html', array( $this, 'post_thumbnail_html' ), 10, 5 );
		add_filter( 'get_post_metadata', array( $this, 'get_post_metadata' ), 10, 4 );

	}

	public function get_edit_post_link( $link, $id, $context ) {

		if ( $this->is_edit() )

			return get_permalink( $id );

		if ( ! is_admin() )

			return $this->edit_link( $id );

		return $link;

	}

	public function edit_post_link( $link, $id ) {

		if ( $this->is_edit() )

			return '<a class="post-edit-link" href="' . get_permalink( $id ) . '">' . __( 'Cancel' ) . '</a>';

		return $link;

	}

	public function wp_enqueue_scripts() {

		global $post;

		if ( $this->is_edit() ) {

			wp_enqueue_style( 'buttons' );
			wp_enqueue_style( 'wp-auth-check' );
			wp_enqueue_style( 'wp-fee-style' , $this->url( '/css/fee.css' ), false, $this->version, 'screen' );

			wp_enqueue_script( 'jquery' );
			wp_enqueue_script( 'heartbeat' );
			wp_enqueue_script( 'wp-auth-check' );
			wp_enqueue_script( 'tinymce-4', $this->url( '/js/tinymce/tinymce.min.js' ), array(), $this->version, true );
			wp_enqueue_script( 'wp-front-end-editor', $this->url( '/js/wp-front-end-editor.js' ), array(), $this->version, true );

			$vars = array(
				'postId' => $post->ID,
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'updatePostNonce' => wp_create_nonce( 'update-post_' . $post->ID ),
				'redirectPostLocation' => esc_url( apply_filters( 'redirect_post_location', '', $post->ID ) )
			);

			wp_localize_script( 'wp-front-end-editor', 'wpFee', $vars );

			wp_enqueue_media( array( 'post' => $post ) );

		} else {

			wp_enqueue_script( 'wp-fee-adminbar', $this->url( '/js/wp-fee-adminbar.js' ), array(), $this->version, true );

			$vars = array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'homeUrl' => home_url( '/' )
			);

			wp_localize_script( 'wp-fee-adminbar', 'wpFee', $vars );

		}

	}

	public function admin_bar_menu( $wp_admin_bar ) {

		global $post;

		$wp_admin_bar->add_node( array(
			'id' => 'wp-fee-close',
			'href' => $post->post_status === 'auto-draft' ? home_url() : get_permalink( $post->ID ),
			'parent' => 'top-secondary',
			'title' => '<span class="ab-icon"></span>',
			'meta' => array(
				'title' => 'Cancel (Esc)'
			),
			'fee' => true
		) );

		if ( $unpublished = in_array( $post->post_status, array( 'auto-draft', 'draft', 'pending' ) ) ) {

			$wp_admin_bar->add_node( array(
				'id' => 'wp-fee-publish',
				'parent' => 'top-secondary',
				'title' => '<span id="wp-fee-publish" class="wp-fee-submit button button-primary" title="' . __( 'Publish' ) . ' (Ctrl + S)" data-default="' . __( 'Publish' ) . '" data-working="' . __( 'Publishing&hellip;' ) . '" data-done="' . __( 'Published!' ) . '">' . __( 'Publish' ) . '</span>',
				'meta' => array(
					'class' => 'wp-core-ui'
				),
				'fee' => true
			) );

		}

		$wp_admin_bar->add_node( array(
			'id' => 'wp-fee-save',
			'parent' => 'top-secondary',
			'title' => '<span id="wp-fee-save" class="wp-fee-submit button' . ( $unpublished ? '' : ' button-primary' ) . '" title="' . ( $unpublished ? __( 'Save' ) : __( 'Update' ) ) . ' (Ctrl + S)" data-default="' . ( $unpublished ? __( 'Save' ) : __( 'Update' ) ) . '" data-working="' . ( $unpublished ? __( 'Saving&hellip;' ) : __( 'Updating&hellip;' ) ) . '" data-done="' . ( $unpublished ? __( 'Saved!' ) : __( 'Updated!' ) ) . '">' . ( $unpublished ? __( 'Save' ) : __( 'Update' ) ) . '</span>',
			'meta' => array(
				'class' => 'wp-core-ui'
			),
			'fee' => true
		) );

		$wp_admin_bar->add_node( array(
			'id' => 'wp-fee-tags',
			'parent' => 'top-secondary',
			'title' => '<span class="ab-icon"></span>',
			'meta' => array(
				'title' => 'Manage Tags'
			),
			'fee' => true
		) );

		$wp_admin_bar->add_node( array(
			'id' => 'tags-input',
			'parent' => 'wp-fee-tags',
			'title' => '<input id="input-tags" class="fee-tag" placeholder="add...">',
			'fee' => true
		) );

		$tags = get_the_tags( $post->ID );

		if ( ! empty( $tags )
			&& is_array( $tags ) ) {

			foreach( $tags as $tag ) {

				$wp_admin_bar->add_node( array(
					'id' => 'tag-' . $tag->term_id,
					'parent' => 'wp-fee-tags',
					'title' => '<span class="ab-icon wp-fee-remove-tag"></span> <span class="wp-fee-tag">' . $tag->name . '</span>',
					'meta' => array(
						'class' => 'wp-fee-tags'
					),
					'fee' => true
				) );

			}

		}

		$wp_admin_bar->add_node( array(
			'id' => 'wp-fee-cats',
			'parent' => 'top-secondary',
			'title' => '<span class="ab-icon"></span>',
			'meta' => array(
				'title' => 'Manage Categories'
			),
			'fee' => true
		) );

		$wp_admin_bar->add_node( array(
			'id' => 'cats-input',
			'parent' => 'wp-fee-cats',
			'title' => '<input id="input-cats" placeholder="add..."><input type="hidden" name="post_category[]" value="0">',
			'meta' => array(
				'html' => $this->wp_terms_checklist( $post )
			),
			'fee' => true
		) );

		$wp_admin_bar->add_node( array(
			'id' => 'wp-fee-mce-toolbar',
			'title' => '',
			'fee' => true
		) );

	}

	public function wp_before_admin_bar_render() {

		global $wp_admin_bar;

		$nodes = $wp_admin_bar->get_nodes();

		if ( is_array( $nodes ) ) {

			foreach ( $nodes as $node => $object ) {

				if ( ( isset( $object->fee )
						&& $object->fee === true )
					|| $node == 'top-secondary' )

					continue;

				$wp_admin_bar->remove_node( $node );

			}

		}

	}

	public function wp_terms_checklist( $post ) {

		ob_start();

		require_once( ABSPATH . 'wp-admin/includes/template.php' );

		wp_terms_checklist( $post->ID, array( 'taxonomy' => 'category' ) );

		return ob_get_clean();

	}

	public function the_title( $title, $id ) {

		global $post, $wp_the_query, $wp_fee;

		if ( is_main_query()
			&& in_the_loop()
			&& $wp_the_query->queried_object->ID === $id
			&& empty( $wp_fee['the_title'] ) ) {

			$wp_fee['the_title'] = true;

			if ( $post->post_status === 'auto-draft' ) {

				$title = apply_filters( 'default_title', '', $post );

			} else {

				$title = $post->post_title;

			}

			$title = '<div id="wp-fee-title-' . $post->ID . '" class="wp-fee-title">' . $title . '</div>';

		}

		return $title;

	}

	public function the_content( $content ) {

		global $post, $wp_fee;

		if ( is_main_query()
			&& in_the_loop()
			&& empty( $wp_fee['the_content'] ) ) {

			$wp_fee['the_content'] = true;

			if ( $post->post_status === 'auto-draft' ) {

				$content = apply_filters( 'default_content', '', $post );

			} else {

				$content = $post->post_content;

			}

			$content = $this->autoembed( $content );
			$content = wpautop( $content );
			$content = shortcode_unautop( $content );
			$content = $this->do_shortcode( $content );
			$content = str_replace( array( '<!--nextpage-->', '<!--more-->' ), array( esc_html( '<!--nextpage-->' ), esc_html( '<!--more-->' ) ), $content );
			$content = '<div class="wp-fee-content-holder"><p class="wp-fee-content-placeholder">&hellip;</p><div id="wp-fee-content-' . $post->ID . '" class="wp-fee-content">' . $content . '</div></div>';

		}

		return $content;

	}

	public function post_thumbnail_html( $html, $post_id, $post_thumbnail_id, $size, $attr ) {

		global $post, $wp_the_query, $wp_fee;

		if ( is_main_query()
			&& in_the_loop()
			&& $wp_the_query->queried_object->ID === $post_id
			&& empty( $wp_fee['the_post_thumbnail'] ) ) {

			$wp_fee['the_post_thumbnail'] = true;

			require_once( ABSPATH . '/wp-admin/includes/post.php' );
			require_once( ABSPATH . '/wp-admin/includes/media.php' );

			return '
			<div id="fee-edit-thumbnail-' . $post->ID . '" class="wp-fee-shortcode-container fee-edit-thumbnail' .  ( $post_thumbnail_id === true ? ' empty' : '' ) . '">
				<div id="postimagediv">
					<div class="inside">
						' . _wp_post_thumbnail_html( get_post_thumbnail_id( $post_id ), $post_id ) . '
					</div>
				</div>
				<div class="wp-fee-shortcode-options">
					<a href="#" id="wp-fee-set-post-thumbnail"></a>
				</div>
			</div>
			';

		}

	}

	// Not sure if this is a good idea, this could have unexpected consequences. But otherwise nothing shows up if the featured image is set in edit mode.
	public function get_post_metadata( $n, $object_id, $meta_key, $single ) {

		global $wp_the_query, $wp_fee;

		if ( is_main_query()
			&& in_the_loop()
			&& $wp_the_query->queried_object->ID === $object_id
			&& $meta_key === '_thumbnail_id'
			&& $single
			&& empty( $wp_fee['filtering_get_post_metadata'] ) ) {

			$wp_fee['filtering_get_post_metadata'] = true;

			$thumbnail_id = get_post_thumbnail_id( $object_id );

			$wp_fee['filtering_get_post_metadata'] = false;

			if ( $thumbnail_id )

				return $thumbnail_id;

			return true;

		}

	}

	// Do not change anything else here, this also affects the featured image meta box on the back-end.
	// http://core.trac.wordpress.org/browser/trunk/src/wp-admin/includes/post.php
	public function admin_post_thumbnail_html( $content, $post_id ) {

		global $content_width, $_wp_additional_image_sizes;

		add_filter( 'wp_get_attachment_image_attributes', '_wp_post_thumbnail_class_filter' );
		
		$post = get_post( $post_id );

		$thumbnail_id = get_post_thumbnail_id( $post_id );

		$upload_iframe_src = esc_url( get_upload_iframe_src( 'image', $post->ID ) );
		$set_thumbnail_link = '<p class="hide-if-no-js"><a title="' . esc_attr__( 'Set featured image' ) . '" href="%s" id="set-post-thumbnail" class="thickbox">%s</a></p>';
		$content = sprintf( $set_thumbnail_link, $upload_iframe_src, esc_html__( 'Set featured image' ) );

		if ( $thumbnail_id
			&& get_post( $thumbnail_id ) ) {

			if ( ! isset( $_wp_additional_image_sizes['post-thumbnail'] ) ) {

				$thumbnail_html = wp_get_attachment_image( $thumbnail_id, array( $content_width, $content_width ) );

			} else {

				$thumbnail_html = wp_get_attachment_image( $thumbnail_id, 'post-thumbnail' );

			}

			if ( ! empty( $thumbnail_html ) ) {

				$ajax_nonce = wp_create_nonce( 'set_post_thumbnail-' . $post->ID );
				
				$content = sprintf( $set_thumbnail_link, $upload_iframe_src, $thumbnail_html );
				$content .= '<p class="hide-if-no-js"><a href="#" id="remove-post-thumbnail" onclick="WPRemoveThumbnail(\'' . $ajax_nonce . '\');return false;">' . esc_html__( 'Remove featured image' ) . '</a></p>';

			}

		}

		return $content;

	}

	public function wp_fee_post() {

		global $wpdb;

		require_once( ABSPATH . '/wp-admin/includes/post.php' );

		if ( ! wp_verify_nonce( $_POST['_wpnonce'], 'update-post_' . $_POST['post_ID'] ) )

			$this->response( __( 'You are not allowed to edit this item.' ) );

		$_POST['post_title'] = strip_tags( $_POST['post_title'] );
		$_POST['post_content'] = str_replace( array( esc_html( '<!--nextpage-->' ), esc_html( '<!--more-->' ) ), array( '<!--nextpage-->', '<!--more-->' ), $_POST['post_content'] );

		$this->response( edit_post() );

	}

	public function wp_fee_shortcode() {

		$this->response( '<div class="wp-fee-shortcode-container mceNonEditable" contenteditable="false"><div style="display:none" class="wp-fee-shortcode">' . wp_unslash( $_POST['shortcode'] ) . '</div>' . do_shortcode( wp_unslash( $_POST['shortcode'] ) ) . '<div class="wp-fee-shortcode-options"><div class="wp-fee-shortcode-remove"></div></div></div>' );

	}

	// http://core.trac.wordpress.org/browser/trunk/src/wp-includes/shortcodes.php
	public function do_shortcode( $content ) {

		global $shortcode_tags;

		if ( empty( $shortcode_tags )
			|| ! is_array( $shortcode_tags ) )

			return $content;

		$pattern = get_shortcode_regex();

		return preg_replace_callback( "/$pattern/s", array( $this, 'do_shortcode_tag' ), $content );

	}

	// http://core.trac.wordpress.org/browser/trunk/src/wp-includes/shortcodes.php
	public function do_shortcode_tag( $m ) {

		global $shortcode_tags;

		// allow [[foo]] syntax for escaping a tag
		if ( $m[1] == '[' && $m[6] == ']' )

			return substr($m[0], 1, -1);

		$tag = $m[2];
		$attr = shortcode_parse_atts( $m[3] );

		$m[5] = isset( $m[5] ) ? $m[5] : null;

		if ( in_array( $tag, array( 'gallery', 'caption' ) ) ) {

			return '<div class="wp-fee-shortcode-container mceNonEditable" contenteditable="false"><div style="display:none" class="wp-fee-shortcode">' . $m[0] . '</div>' . $m[1] . call_user_func( $shortcode_tags[$tag], $attr, $m[5], $tag ) . $m[6] . '<div class="wp-fee-shortcode-options"><div class="wp-fee-shortcode-remove"></div></div></div>';

		}

		return $m[0];

	}

	public function wp_fee_embed() {

		$embed = wp_oembed_get( $_POST['content'] );

		if ( $embed ) {

			$this->response( '<div class="wp-fee-shortcode-container mceNonEditable" contenteditable="false"><div style="display:none" class="wp-fee-shortcode">' . $_POST['content'] . '</div>' . $embed . '<div class="wp-fee-shortcode-options"><div class="wp-fee-shortcode-remove"></div></div></div>' );

		}

		$this->response( $_POST['content'] );

	}

	public function autoembed( $content ) {

		return preg_replace_callback( '|^\s*(https?://[^\s"]+)\s*$|im', array( $this, 'autoembed_callback' ), $content );

	}

	public function autoembed_callback( $m ) {

		global $wp_embed;

		$oldval = $wp_embed->linkifunknown;
		$wp_embed->linkifunknown = false;
		$return = $wp_embed->shortcode( array(), $m[1] );
		$wp_embed->linkifunknown = $oldval;

		return '<div class="wp-fee-shortcode-container mceNonEditable" contenteditable="false"><div style="display:none" class="wp-fee-shortcode">' . $m[0] . '</div>' . $return . '<div class="wp-fee-shortcode-options"><div class="wp-fee-shortcode-remove"></div></div></div>';

	}

	public function wp_fee_new() {

		require_once( ABSPATH . '/wp-admin/includes/post.php' );

		$post = get_default_post_to_edit( isset( $_POST['post_type'] ) ? $_POST['post_type'] : 'post', true );

		$this->response( $post->ID );

	}

	public function admin_enqueue_scripts() {

		wp_enqueue_script( 'wp-back-end-editor', $this->url( '/js/wp-back-end-editor.js' ), array(), $this->version, true );

	}

	public function redirect_post_location( $location, $post_id ) {

		return $this->edit_link( $post_id );

	}

}
