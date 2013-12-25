<?php

class WP_Front_End_Editor {
	
	public $version = '0.4.2';
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
		
		if ( ! current_theme_supports( 'front-end-editor' ) )
			return;
		
		// TODO add endpoints for custom post types that support the front-end editor
		
		add_rewrite_endpoint( 'edit', EP_PERMALINK | EP_PAGES );
		
		add_action( 'wp_ajax_wpfee_post', array( $this, 'wpfee_post' ) );
		add_action( 'wp_ajax_wpfee_shortcode', array( $this, 'wpfee_shortcode' ) );
		add_action( 'wp_ajax_wpfee_thumbnail', array( $this, 'wpfee_thumbnail' ) );
		add_action( 'wp', array( $this, 'wp' ) );
		
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
//		add_filter( 'comments_template', array( $this, 'comments_template' ) );
		
	}
	
	public function get_edit_post_link( $link, $id, $context ) {
		
		$post = get_post( $id );
		
		if ( $this->is_edit() )
			return get_permalink( $id );
		
		if ( ! is_admin() )
			return ( ! get_option( 'permalink_structure' ) || $post->post_status == 'draft' ) ? get_permalink( $id ) . '&edit' : get_permalink( $id ) . 'edit/';
		
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
		
		require_once( 'editor-template.php' );
		
	}
	
	public function wp_before_admin_bar_render() {
		
		global $wp_admin_bar;
				
		foreach ( $wp_admin_bar->get_nodes() as $node => $object ) {
			
			if ( ( isset( $object->fee ) && $object->fee == true ) || $node == 'top-secondary' ) {
								
				continue;
				
			}
			
			$wp_admin_bar->remove_node( $node );
			
		}
		
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
	
	public function wp_terms_checklist( $post ) {
		
		ob_start();
		
		require_once( ABSPATH . 'wp-admin/includes/template.php' );
		
		wp_terms_checklist( $post->ID, array( 'taxonomy' => 'category' ) );
		
		return ob_get_clean();
		
	}
	
	public function the_title( $title, $id ) {
		
		global $post;
		
		if ( $post->ID === $id && in_the_loop() )
			return '<div id="fee-edit-title-' . $post->ID . '">' . $title . '</div>';
		
		return $title;
		
	}
	
	public function the_content( $content ) {
		
		global $post;
		
		$content = $post->post_content;
		$content = wpautop( $content );
		$content = shortcode_unautop( $content );
		$content = $this->do_shortcode( $content );
		$content = str_replace( array( '<!--nextpage-->', '<!--more-->' ), array( esc_html( '<!--nextpage-->' ), esc_html( '<!--more-->' ) ), $content );
		$content = '<div id="fee-edit-content-' . $post->ID . '" class="contenteditable">' . $content . '</div>';
			
		return $content;
		
	}
	
	public function post_thumbnail_html( $html, $post_id, $post_thumbnail_id, $size, $attr ) {
		
		global $post;
		
		if ( $post->ID === $post_id && in_the_loop() )
			return '
			<div id="fee-edit-thumbnail-' . $post->ID . '" class="fee-edit-thumbnail">
				<div id="postimagediv">
					<div class="inside">
						' . $html . '
					</div>
					<div id="set-post-thumbnail" class="fee-edit-thumbnail-button">
						<div id="fee-edit-thumbnail-icon" class="has-dashicon"></div>
					</div>
				</div>
			</div>
			<input type="hidden" name="fee_post_thumbnail_size" value="' . $size . '" />
			';
		
	}
	
//	public function comments_template( $file ) {
//		
//		return $this->path() . 'comments.php';
//		
//	}
	
	public function wpfee_post() {
		
		global $wpdb;
		
		if ( ! current_user_can( 'edit_post', $_POST['ID'] ) )
			$this->response( __( 'You are not allowed to edit this item.' ) );
		
		if ( ! wp_verify_nonce( $_POST['_wpnonce'], 'fee_update_post_' . $_POST['ID'] ) )
			$this->response( __( 'You are not allowed to edit this item.' ) );
		
		if ( ! isset( $_POST['ID'] ) )
			$this->response( __( 'You attempted to edit an item that doesn&#8217;t exist. Perhaps it was deleted?' ) );
		
		$post['ID'] = $_POST['ID'];
		$post['post_title'] = $_POST['post_title'];
		$post['post_title'] = strip_tags($post['post_title']);
		$post['post_content'] = $_POST['post_content'];
		$post['post_content'] = str_replace( array( esc_html( '<!--nextpage-->' ), esc_html( '<!--more-->' ) ), array( '<!--nextpage-->', '<!--more-->' ), $post['post_content'] );
		$post['post_category'] = $_POST['post_category'];
		$post['tags_input'] = $_POST['tags_input'];
		
		$id = wp_update_post( $post, true );
		
		if ( is_wp_error( $id ) )
			$this->response( __( $id->get_error_message() ) );
		
		$this->response( $id );
		
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
		
		if ( $tag == 'gallery' ) {
			
			return '<div class="wp-fee-shortcode-container" contenteditable="false"><div style="display:none" class="wp-fee-shortcode">' . $m[0] . '</div>' . $m[1] . call_user_func( $shortcode_tags[$tag], $attr, $m[5], $tag ) . $m[6] . '<div class="wp-fee-shortcode-options"><div class="wp-fee-shortcode-remove"></div></div></div>';
			
		} else {
			
			return $m[0];
			
		}
		
	}
	
	public function wpfee_shortcode() {
		
		$this->response( '<div class="wp-fee-shortcode-container" contenteditable="false"><div style="display:none" class="wp-fee-shortcode">' . wp_unslash( $_POST['shortcode'] ) . '</div>' . do_shortcode( wp_unslash( $_POST['shortcode'] ) ) . '<div class="wp-fee-shortcode-options"><div class="wp-fee-shortcode-remove"></div></div></div>' );
		
	}
	
	public function wpfee_thumbnail() {
		
		$this->response( wp_get_attachment_image_src( get_post_thumbnail_id( $_POST['ID'] ), $_POST['size'] ) );
		
	}
	
}