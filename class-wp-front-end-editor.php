<?php

class WP_Front_End_Editor {
	
	public $version = '0.4.4';
	public $version_tinymce = '4.0.10';
	
	public $plugin = 'wp-front-end-editor/wp-front-end-editor.php';
	
	private static $instance;
	
	private function url() {
		
		return plugin_dir_url( __FILE__ );
		
	}
	
	private function path() {
		
		return dirname( __FILE__ ) . '/';
		
	}
			
	private function response( $response ) {
		
		echo $response;
		die();
		
	}
	
	public static function is_edit() {
		
		global $wp_query;
		
		return ( isset( $wp_query->query_vars['edit'] ) ) ? true : false;
		
	}
	
	public static function edit_link( $id ) {
		
		$post = get_post( $id );
		
		if ( ! $post)
			return false;
			
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
		
		if ( empty( $wp_version ) || version_compare( $wp_version, '3.8', '<' ) || version_compare( $wp_version, '3.9-beta', '>=' ) ) {
		
			add_action( 'admin_init', array( $this, 'admin_init' ) );
			add_action( 'admin_notices', array( $this, 'admin_notices' ) );
			
			return;
		
		}
		
		register_activation_hook( $this->plugin, array( $this, 'activate' ) );
		
		add_action( 'after_setup_theme', array( $this, 'after_setup_theme' ) ); // temporary
		add_action( 'init', array( $this, 'init' ) );
		
	}
	
	public function admin_init() {
		
		deactivate_plugins( $this->plugin );
		
	}
	
	public function admin_notices() {
		
		echo '<div class="error"><p><strong>WordPress Front-end Editor</strong> currently only works between versions 3.8-alpha and 3.9-alpha.</p></div>';
		
		if ( isset( $_GET['activate'] ) )
			unset( $_GET['activate'] );
		
	}
	
	public function activate() {
		
		add_rewrite_endpoint( 'edit', EP_PERMALINK | EP_PAGES );
		
		flush_rewrite_rules();
		
	}
	
	public function after_setup_theme() {
				
		add_theme_support( 'front-end-editor' );
		
	}
	
	public function init() {
		
		global $pagenow;
		
		if ( ! current_theme_supports( 'front-end-editor' ) )
			return;
		
		add_rewrite_endpoint( 'edit', EP_PERMALINK | EP_PAGES );
		
		add_action( 'wp', array( $this, 'wp' ) );
		
		if( is_admin() && $pagenow == 'post.php' || $pagenow == 'post-new.php' )
			add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
		
		if ( isset( $_POST['wp_fee_redirect'] ) && $_POST['wp_fee_redirect'] == '1' )
			add_filter( 'redirect_post_location', array( $this, 'redirect_post_location' ), 10, 2 );
		
		add_filter( 'admin_post_thumbnail_html', array( $this, 'admin_post_thumbnail_html' ), 10, 2 );
		
		add_action( 'wp_ajax_wp_fee_post', array( $this, 'wp_fee_post' ) );
		add_action( 'wp_ajax_wp_fee_shortcode', array( $this, 'wp_fee_shortcode' ) );
		add_action( 'wp_ajax_wp_fee_embed', array( $this, 'wp_fee_embed' ) );
		add_action( 'wp_ajax_wp_fee_thumbnail', array( $this, 'wp_fee_thumbnail' ) );
				
	}
	
	public function wp() {
		
		global $post;
		
		add_filter( 'get_edit_post_link', array( $this, 'get_edit_post_link' ), 10, 3 );
		add_filter( 'edit_post_link', array( $this, 'edit_post_link' ), 10, 2 );
		
		if ( ! $this->is_edit() )
			return;
		
		// When in core this should probably be forced just like the admin bar on the back-end. Hiding the admin bar for the front-end editor is not the right way to turn it off.
		add_filter( 'show_admin_bar', '__return_true' );
		
		if ( ! $post )
			wp_die( __( 'You attempted to edit an item that doesn&#8217;t exist. Perhaps it was deleted?' ) );
		
		if ( ! current_user_can( 'edit_post', $post->ID ) )
			wp_die( __( 'You are not allowed to edit this item.' ) );
		
		require_once( ABSPATH . '/wp-admin/includes/media.php' );
		
		add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ) );
		add_action( 'wp_footer', array( $this, 'wp_footer' ), 1 );
		add_action( 'admin_bar_menu', array( $this, 'admin_bar_menu' ), 10 );
		add_action( 'wp_before_admin_bar_render', array( $this, 'wp_before_admin_bar_render' ), 100 );
		
		add_filter( 'the_title', array( $this, 'the_title' ), 20, 2 );
		add_filter( 'the_content', array( $this, 'the_content' ), 20 );
		add_filter( 'wp_link_pages', '__return_empty_string', 20 );
		add_filter( 'post_thumbnail_html', array( $this, 'post_thumbnail_html' ), 10, 5 );
		add_filter( 'get_post_metadata', array( $this, 'get_post_metadata' ), 10, 4 );
		
	}
	
	public function get_edit_post_link( $link, $id, $context ) {
		
		$post = get_post( $id );
		
		if ( $this->is_edit() )
			return get_permalink( $id );
		
		if ( ! is_admin() )
			return $this->edit_link( $id );
		
		return $link;
		
	}
	
	public function edit_post_link( $link, $id ) {
		
		if ( $this->is_edit() )
			return '<a class="post-edit-link" href="' . get_permalink( $id ) . '">' . __('Cancel') . '</a>';
		
		return $link;
		
	}
	
	public function wp_enqueue_scripts() {
		
		global $post;
		
		wp_enqueue_style( 'wp-fee-style' , $this->url() . 'css/fee.css', false, $this->version, 'screen' );
		wp_enqueue_style( 'buttons' );
		
		wp_enqueue_script( 'jquery' );
		wp_enqueue_script( 'jquery-ui-draggable' );
		wp_enqueue_script( 'tinymce-4', $this->url() . 'js/tinymce/tinymce.min.js', array(), $this->version_tinymce, true );
		wp_enqueue_script( 'wp-front-end-editor', $this->url() . 'js/wp-front-end-editor.js', array(), $this->version, true );
		
		wp_localize_script( 'wp-front-end-editor', 'wp_fee', array( 'post_id' => $post->ID, 'ajax_url' => admin_url( 'admin-ajax.php' ) ) );
		
	}
	
	public function wp_footer() {
		
		global $post;
		
		echo '
		<div id="fee-saving" class="fee-reset"></div>
		<div id="fee-success" class="wp-core-ui fee-reset">
			<div id="fee-message">
				<p id="fee-ajax-message">Post Updated.</p>
				<a id="fee-continue" class="button button-large" href="#">Continue editing</a>
				<a class="button button-primary button-large wp-fee-cancel" href="' . get_permalink( $post->ID ) . '">View ' . $post->post_type . '</a>
			</div>
		</div>
		<div id="fee-mce-toolbar" class="fee-reset fee-element"></div>
		';
		
		wp_nonce_field( 'fee_update_post_' . $post->ID );
		media_buttons( 'fee-edit-content-' . $post->ID );
		
	}
	
	public function admin_bar_menu( $wp_admin_bar ) {
		
		global $post;
		
		$id = 'wp-fee-close';
		$nodes[$id]['id'] = $id;
		$nodes[$id]['href'] = get_permalink( $post->ID );
		$nodes[$id]['parent'] = 'top-secondary';
		$nodes[$id]['title'] = '<span class="ab-icon"></span>';
		$nodes[$id]['fee'] = true;
		
		$id = 'wp-fee-save';
		$nodes[$id]['id'] = $id;
		$nodes[$id]['parent'] = 'top-secondary';
		$nodes[$id]['title'] = '<span id="fee-save" class="button button-primary" href="#">Save</span>';
		$nodes[$id]['meta']['class'] = 'wp-core-ui';
		$nodes[$id]['fee'] = true;
		
		$id = 'wp-fee-media';
		$nodes[$id]['id'] = $id;
		$nodes[$id]['href'] = '#';
		$nodes[$id]['parent'] = 'top-secondary';
		$nodes[$id]['title'] = '<span class="ab-icon"></span>';
		$nodes[$id]['meta']['class'] = 'insert-media add_media';
		$nodes[$id]['meta']['title'] = 'Manage Media';
		$nodes[$id]['fee'] = true;
		
		$id = 'wp-fee-tags';
		$nodes[$id]['id'] = $id;
		$nodes[$id]['parent'] = 'top-secondary';
		$nodes[$id]['title'] = '<span class="ab-icon"></span>';
		$nodes[$id]['meta']['title'] = 'Manage Tags';
		$nodes[$id]['fee'] = true;
		
		$id = 'tags-input';
		$nodes[$id]['id'] = $id;
		$nodes[$id]['parent'] = 'wp-fee-tags';
		$nodes[$id]['title'] = '<input id="input-tags" class="fee-tag" placeholder="add...">';
		$nodes[$id]['fee'] = true;
		
		$tags = get_the_tags( $post->ID );
		
		if ( $tags ) {
			
			foreach( $tags as $tag ) {
								
				$id = 'tag-' . $tag->term_id;
				$nodes[$id]['id'] = $id;
				$nodes[$id]['parent'] = 'wp-fee-tags';
				$nodes[$id]['title'] = '<span class="ab-icon wp-fee-remove-tag"></span> <span class="wp-fee-tag">' . $tag->name . '</span>';
				$nodes[$id]['meta']['class'] = 'wp-fee-tags';
				$nodes[$id]['fee'] = true;
				
			}
			
		}
		
		$id = 'wp-fee-cats';
		$nodes[$id]['id'] = $id;
		$nodes[$id]['parent'] = 'top-secondary';
		$nodes[$id]['title'] = '<span class="ab-icon"></span>';
		$nodes[$id]['meta']['title'] = 'Manage Categories';
		$nodes[$id]['fee'] = true;
		
		$id = 'cats-input';
		$nodes[$id]['id'] = $id;
		$nodes[$id]['parent'] = 'wp-fee-cats';
		$nodes[$id]['title'] = '<input id="input-cats" placeholder="add..."><input type="hidden" name="post_category[]" value="0">';
		$nodes[$id]['meta']['html'] = $this->wp_terms_checklist( $post );
		$nodes[$id]['fee'] = true;
		
		$id = 'wp-fee-mce-toolbar';
		$nodes[$id]['id'] = $id;
		$nodes[$id]['title'] = '';
		$nodes[$id]['fee'] = true;
		
		foreach ( $nodes as $node ) {
						
			$wp_admin_bar->add_node( $node );
			
		}
		
	}
	
	public function wp_before_admin_bar_render() {
		
		global $wp_admin_bar;
		
		if ( $nodes = $wp_admin_bar->get_nodes() ) {
			
			foreach ( $nodes as $node => $object ) {
				
				if ( ( isset( $object->fee ) && $object->fee == true ) || $node == 'top-secondary' || $node == 'debug-bar' )
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
		
		global $post, $wp_fee;
		
		// This checks if we're in the loop, the_title is actually this post's title and this is the first time we're filtering.
		// There can only be one editable title, so that we know which one to save. Imagine the case were a different post's title is being displayed in the loop.
		// Only do this once because it's possible that the theme calls the_title twice.
		if ( $post->ID === $id && in_the_loop() && empty( $wp_fee['the_title'] ) ) {
			
			$wp_fee['the_title'] = true;
			
			$title = '<div id="fee-edit-title-' . $post->ID . '">' . $title . '</div>';
			
		}
		
		return $title;
		
	}
	
	public function the_content( $content ) {
		
		global $post, $wp_fee;
		
		if ( in_the_loop() && empty( $wp_fee['the_content'] ) ) {
			
			$wp_fee['the_content'] = true;
			
			$content = $post->post_content;
			$content = $this->autoembed( $content );
			$content = wpautop( $content );
			$content = shortcode_unautop( $content );
			$content = $this->do_shortcode( $content );
			$content = str_replace( array( '<!--nextpage-->', '<!--more-->' ), array( esc_html( '<!--nextpage-->' ), esc_html( '<!--more-->' ) ), $content );
			$content = '<div id="fee-edit-content-' . $post->ID . '" class="contenteditable">' . $content . '</div>';
			
		}
			
		return $content;
		
	}
	
	public function post_thumbnail_html( $html, $post_id, $post_thumbnail_id, $size, $attr ) {
		
		global $post, $wp_fee;
				
		if ( $post->ID === $post_id && in_the_loop() && empty( $wp_fee['the_post_thumbnail'] ) ) {
			
			$wp_fee['the_post_thumbnail'] = true;
			
			require_once( ABSPATH . '/wp-admin/includes/post.php' );
			
			// It'd be good if we could set the $size with _wp_post_thumbnail_html().
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
		
		global $wp_fee;
		
		if ( ! in_the_loop() )
			return;
		
		if ( $meta_key === '_thumbnail_id' && empty( $wp_fee['filtering_get_post_metadata'] ) && $single ) {
			
			$wp_fee['filtering_get_post_metadata'] = true;
			
			if ( $thumbnail_id = get_post_thumbnail_id( $object_id ) ) {
				
				$wp_fee['filtering_get_post_metadata'] = false;
				
				return $thumbnail_id;
				
			} else {
				
				$wp_fee['filtering_get_post_metadata'] = false;
				
				return true;
				
			}
			
		}
		
	}
	
	// Do not change anything else here, this also affects the featured image meta box on the back-end.
	// http://core.trac.wordpress.org/browser/trunk/src/wp-admin/includes/post.php
	public function admin_post_thumbnail_html( $content, $post_id ) {
		
		global $content_width, $_wp_additional_image_sizes;
		
		add_filter( 'wp_get_attachment_image_attributes', '_wp_post_thumbnail_class_filter' );
		
		$thumbnail_id = get_post_thumbnail_id( $post_id );
		$post = get_post( $post_id );
	
		$upload_iframe_src = esc_url( get_upload_iframe_src('image', $post->ID ) );
		$set_thumbnail_link = '<p class="hide-if-no-js"><a title="' . esc_attr__( 'Set featured image' ) . '" href="%s" id="set-post-thumbnail" class="thickbox">%s</a></p>';
		$content = sprintf( $set_thumbnail_link, $upload_iframe_src, esc_html__( 'Set featured image' ) );
	
		if ( $thumbnail_id && get_post( $thumbnail_id ) ) {
			
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
		
		if ( ! current_user_can( 'edit_post', $_POST['ID'] ) )
			$this->response( __( 'You are not allowed to edit this item.' ) );
		
		if ( ! wp_verify_nonce( $_POST['_wpnonce'], 'fee_update_post_' . $_POST['ID'] ) )
			$this->response( __( 'You are not allowed to edit this item.' ) );
		
		if ( ! isset( $_POST['ID'] ) )
			$this->response( __( 'You attempted to edit an item that doesn&#8217;t exist. Perhaps it was deleted?' ) );
		
		$post['ID'] = $_POST['ID'];
		$post['post_title'] = $_POST['post_title'];
		$post['post_title'] = strip_tags( $post['post_title'] );
		$post['post_content'] = $_POST['post_content'];
		$post['post_content'] = str_replace( array( esc_html( '<!--nextpage-->' ), esc_html( '<!--more-->' ) ), array( '<!--nextpage-->', '<!--more-->' ), $post['post_content'] );
		$post['post_category'] = $_POST['post_category'];
		$post['tags_input'] = $_POST['tags_input'];
		
		$id = wp_update_post( $post, true );
		
		if ( is_wp_error( $id ) )
			$this->response( __( $id->get_error_message() ) );
		
		$this->response( $id );
		
	}
	
	public function wp_fee_shortcode() {
		
		$this->response( '<div class="wp-fee-shortcode-container mceNonEditable" contenteditable="false"><div style="display:none" class="wp-fee-shortcode">' . wp_unslash( $_POST['shortcode'] ) . '</div>' . do_shortcode( wp_unslash( $_POST['shortcode'] ) ) . '<div class="wp-fee-shortcode-options"><div class="wp-fee-shortcode-remove"></div></div></div>' );
		
	}
	
	// http://core.trac.wordpress.org/browser/trunk/src/wp-includes/shortcodes.php
	public function do_shortcode( $content ) {
		
		global $shortcode_tags;
		
		if ( empty( $shortcode_tags ) || ! is_array( $shortcode_tags ) )
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
			
		} else {
			
			return $m[0];
			
		}
		
	}
	
	public function wp_fee_embed() {
		
		if ( $embed = wp_oembed_get( $_POST['content'] ) ) {
			
			$this->response( '<div class="wp-fee-shortcode-container mceNonEditable" contenteditable="false"><div style="display:none" class="wp-fee-shortcode">' . $_POST['content'] . '</div>' . $embed . '<div class="wp-fee-shortcode-options"><div class="wp-fee-shortcode-remove"></div></div></div>' );
			
		} else {
			
			$this->response( $_POST['content'] );
			
		}
		
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
	
	public function wp_fee_thumbnail() {
		
		$src = wp_get_attachment_image_src( get_post_thumbnail_id( $_POST['ID'] ) );
		
		$this->response( $src[0] );
		
	}
	
	public function admin_enqueue_scripts() {
		
		wp_enqueue_script( 'wp-back-end-editor', $this->url() . 'js/wp-back-end-editor.js', array(), $this->version, true );
		
	}
	
	public function redirect_post_location( $location, $post_id ) {
	
		return $this->edit_link( $post_id );
		
	}
	
}
