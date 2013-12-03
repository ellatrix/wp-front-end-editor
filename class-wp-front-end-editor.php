<?php

class WP_Front_End_Editor {
	
	public $version = '0.3.2';
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
		
		if ( empty( $wp_version ) || version_compare( $wp_version, '3.8-alpha', '<' ) || version_compare( $wp_version, '3.9-beta', '>=' ) ) {
		
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
		
		if ( ! $post )
			wp_die( __( 'You attempted to edit an item that doesn&#8217;t exist. Perhaps it was deleted?' ) );
		
		if ( ! current_user_can( 'edit_post', $post->ID ) )
			wp_die( __( 'You are not allowed to edit this item.' ) );
		
		require_once( ABSPATH . '/wp-admin/includes/media.php' );
		
		add_action( 'wp_head', array( $this, 'wp_head' ) );
		add_action( 'wp_footer', array( $this, 'wp_footer' ), 1 );
		
		add_filter( 'the_title', array( $this, 'the_title' ), 20, 2 );
		add_filter( 'the_content', array( $this, 'the_content' ), 20 );
		add_filter( 'wp_link_pages', array( $this, 'wp_link_pages' ), 20 );
		add_filter( 'post_thumbnail_html', array( $this, 'post_thumbnail_html' ), 10, 5 );
		add_filter( 'comments_template', array( $this, 'comments_template' ) );
		
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
	
	public function wp_head() {
		
		global $post;
		
		wp_enqueue_style( 'fee-style' , $this->url() . 'css/fee.css', false, $this->version, 'screen' );
		wp_enqueue_style( 'fee-buttons', $this->url() . 'css/buttons.css', false, $this->version, 'screen' );
		wp_enqueue_style( 'genericons', $this->url() . 'css/genericons.css', false, $this->version, 'screen' );
		
		wp_enqueue_script( 'jquery' );
		wp_enqueue_script( 'jquery-ui-draggable' );
		wp_enqueue_script( 'tinymce-4', $this->url() . 'js/tinymce/tinymce.min.js', array(), $this->version_tinymce, true );
		wp_enqueue_script( 'wp-front-end-editor', $this->url() . 'js/wp-front-end-editor.js', array(), $this->version, true );
		
		wp_localize_script( 'wp-front-end-editor', 'wp_front_end_editor', array( 'post_id' => $post->ID, 'ajax_url' => admin_url( 'admin-ajax.php' ) ) );
		
	}
	
	public function wp_footer() {
		
		global $post;
		
		require_once( 'editor-template.php' );
		
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
		$content = str_replace( '<!--nextpage-->' , esc_html( '<!--nextpage-->' ) , $content );
		$content = '<div id="fee-edit-content-' . $post->ID . '" class="contenteditable">' . $content . '</div>';
			
		return $content;
		
	}
	
	public function wp_link_pages( $output ) {
		
		return '';
		
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
	
	public function comments_template( $file ) {
		
		return $this->path() . 'meta.php';
		
	}
	
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
		$post['post_content'] = str_replace(esc_html('<!--nextpage-->'), '<!--nextpage-->', $post['post_content']);
		$post['post_category'] = $_POST['post_category'];
		$post['tags_input'] = $_POST['tags_input'];
		
		$id = wp_update_post( $post, true );
		
		if ( is_wp_error( $id ) )
			$this->response( __( $id->get_error_message() ) );
		
		$this->response( $id );
		
	}
	
	public function wpfee_shortcode() {
		
		$this->response( do_shortcode( wp_unslash( $_POST['shortcode'] ) ) );
		
	}
	
	public function wpfee_thumbnail() {
		
		$this->response( wp_get_attachment_image_src( get_post_thumbnail_id( $_POST['ID'] ), $_POST['size'] ) );
		
	}
	
}