<?php

class FEE {
	public $package;
	public $wp_version;

	private $fee;

	function __construct() {
		$dir = dirname( __FILE__ );

		if ( file_exists( $dir . '/package.json' ) ) {
			$package = $dir . '/package.json';
		} elseif ( file_exists( dirname( $dir ) . '/package.json' ) ) {
			$package = dirname( $dir ) . '/package.json';
		}

		$this->package = json_decode( file_get_contents( $package ), true );

		include ABSPATH . WPINC . '/version.php';

		$this->wp_version = str_replace( '-src', '', $wp_version );

		if ( version_compare( $this->wp_version, $this->package['wp']['min'], '<' ) ) {
			return add_action( 'admin_notices', array( $this, 'admin_notices' ) );
		}

		add_post_type_support( 'post', 'front-end-editor' );
		add_post_type_support( 'page', 'front-end-editor' );

		add_action( 'init', array( $this, 'init' ) );
	}

	function admin_notices() {
		echo '<div class="error"><p>' . sprintf( __( '<strong>WordPress Front-end Editor</strong> requires WordPress version %s or higher.' ), $this->package['wp']['min'] ) . '</p></div>';
	}

	function init() {
		global $wp_post_statuses;

		// Lets auto-drafts pass as drafts by WP_Query.
		$wp_post_statuses['auto-draft']->protected = true;

		add_filter( 'get_edit_post_link', array( $this, 'get_edit_post_link' ), 10, 3 );

		add_action( 'wp_ajax_fee_post', array( $this, 'ajax_post' ) );
		add_action( 'wp_ajax_fee_new', array( $this, 'ajax_new' ) );
		add_action( 'wp_ajax_fee_slug', array( $this, 'ajax_slug' ) );
		add_action( 'wp_ajax_fee_shortcode', array( $this, 'ajax_shortcode' ) );
		add_action( 'wp_ajax_fee_thumbnail', array( $this, 'ajax_thumbnail' ) );
		add_action( 'wp_ajax_fee_categories', array( $this, 'ajax_categories' ) );

		add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ) );
		add_action( 'wp', array( $this, 'wp' ) );
	}

	function get_edit_post_link( $link, $id, $context ) {
		return $this->supports_fee( $id ) && ! is_admin() ? $this->edit_link( $id ) : $link;
	}

	function ajax_post() {
		require_once( ABSPATH . '/wp-admin/includes/post.php' );

		if ( ! wp_verify_nonce( $_POST['_wpnonce'], 'update-post_' . $_POST['post_ID'] ) ) {
			wp_send_json_error( array( 'message' => __( 'You are not allowed to edit this item.' ) ) );
		}

		$_POST['post_title'] = strip_tags( $_POST['post_title'] );
		$_POST['sticky'] = is_sticky( $_POST['post_ID'] );

		$post_id = edit_post();

		if ( isset( $_POST['save'] ) || isset( $_POST['publish'] ) ) {
			$status = get_post_status( $post_id );

			if ( isset( $_POST['publish'] ) ) {
				switch ( $status ) {
					case 'pending':
						$message = 8;
						break;
					case 'future':
						$message = 9;
						break;
					default:
						$message = 6;
				}
			} else {
				$message = 'draft' == $status ? 10 : 1 ;
			}
		} else {
			$message = 4;
		}

		$post = get_post( $post_id );

		wp_send_json_success( array(
			'message' => $this->get_message( $post, $message ),
			'post' => $post,
			'processedPostContent' => apply_filters( 'the_content', $post->post_content )
		) );
	}

	function ajax_new() {
		check_ajax_referer( 'fee-new', 'nonce' );

		require_once( ABSPATH . '/wp-admin/includes/post.php' );

		$post = get_default_post_to_edit( isset( $_POST['post_type'] ) ? $_POST['post_type'] : 'post', true );
		wp_set_post_categories( $post->ID, array( get_option( 'default_category' ) ) );

		wp_send_json_success( $this->edit_link( $post->ID ) );
	}

	function ajax_slug() {
		check_ajax_referer( 'slug-nonce_' . $_POST['post_ID'], '_wpnonce' );

		$sample = get_sample_permalink( $_POST['post_ID'], $_POST['post_title'], $_POST['post_name'] );

		wp_send_json_success( $sample[1] );
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

	function ajax_categories() {
		global $post;

		check_ajax_referer( 'fee-categories_' . $_POST['post_ID'], 'nonce' );

		$post = get_post( $_POST['post_ID'] );

		setup_postdata( $post );

		$original_categories = $this->get_post_tax_and_terms();
		$original_categories = $original_categories['category'];
		wp_set_post_categories( $_POST['post_ID'], isset( $_POST['post_category'] ) ? $_POST['post_category'] : array() );
		$list = get_the_category_list( urldecode( $_POST['separator'] ), urldecode( $_POST['parents'] ) );
		wp_set_post_categories( $_POST['post_ID'], $original_categories );

		wp_send_json_success( $list );
	}

	function wp_enqueue_scripts() {

		global $post, $wp_version, $tinymce_version, $concatenate_scripts, $compress_scripts;

		if ( ! isset( $concatenate_scripts ) ) {
			script_concat_settings();
		}

		$compressed =
			$compress_scripts &&
			$concatenate_scripts &&
			isset( $_SERVER['HTTP_ACCEPT_ENCODING'] ) &&
			false !== stripos( $_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip' );

		$suffix = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) || file_exists( dirname( __FILE__ ) . '/.gitignore' ) ? '' : '.min';

		if ( $this->has_fee() ) {
			wp_enqueue_style( 'wp-core-ui' , $this->url( '/css/wp-core-ui.css' ), false, $this->package['version'], 'screen' );
			wp_enqueue_style( 'wp-core-ui-colors' , $this->url( '/css/wp-core-ui-colors.css' ), false, $this->package['version'], 'screen' );
			wp_enqueue_style( 'buttons' );
			wp_enqueue_style( 'wp-auth-check' );

			wp_enqueue_script( 'wp-auth-check' );

			wp_enqueue_script( 'autosave-custom', $this->url( '/js/autosave' . $suffix . '.js' ), array( 'schedule', 'wp-ajax-response', 'fee' ), $this->package['version'], true );
			wp_localize_script( 'autosave-custom', 'autosaveL10n', array(
				'autosaveInterval' => AUTOSAVE_INTERVAL,
				'blog_id' => get_current_blog_id()
			) );

			// Load tinymce.js when running from /src, else load wp-tinymce.js.gz (production) or tinymce.min.js (SCRIPT_DEBUG)
			$mce_suffix = false !== strpos( $wp_version, '-src' ) ? '' : '.min';

			if ( $compressed ) {
				wp_enqueue_script( 'fee-tinymce', includes_url( 'js/tinymce' ) . '/wp-tinymce.php?c=1', array(), $tinymce_version, true );
			} else {
				wp_enqueue_script( 'fee-tinymce', includes_url( 'js/tinymce' ) . '/tinymce' . $mce_suffix . '.js', array(), $tinymce_version, true );
				wp_enqueue_script( 'fee-tinymce-compat3x', includes_url( 'js/tinymce' ) . '/plugins/compat3x/plugin' . $suffix . '.js', array( 'fee-tinymce' ), $tinymce_version, true );
			}

			if ( empty( $suffix ) ) {
				wp_enqueue_script( 'fee-tinymce-image', $this->url( '/js/tinymce.image.js' ), array( 'fee-tinymce' ), $this->package['version'], true );
				wp_enqueue_script( 'fee-tinymce-insert', $this->url( '/js/tinymce.insert.js' ), array( 'fee-tinymce' ), $this->package['version'], true );
				wp_enqueue_script( 'fee-tinymce-markdown', $this->url( '/js/tinymce.markdown.js' ), array( 'fee-tinymce' ), $this->package['version'], true );
				wp_enqueue_script( 'fee-tinymce-more', $this->url( '/js/tinymce.more.js' ), array( 'fee-tinymce' ), $this->package['version'], true );
				wp_enqueue_script( 'fee-tinymce-view', $this->url( '/js/tinymce.view.js' ), array( 'fee-tinymce' ), $this->package['version'], true );

				wp_enqueue_script( 'fee-tinymce-theme', $this->url( '/js/tinymce.theme.js' ), array( 'fee-tinymce' ), $this->package['version'], true );
			} else {
				wp_enqueue_script( 'fee-tinymce-plugins', $this->url( '/js/tinymce.min.js' ), array( 'fee-tinymce' ), $this->package['version'], true );
			}

			$tinymce_plugins = array(
				'wordpress',
				'feeImage',
				'feeMarkDown',
				'wpmore',
				'wplink',
				'wpview',
				'paste',
				'insert',
				'hr',
				'lists'
			);

			$tinymce_toolbar = array(
				'bold',
				'italic',
				'strikethrough',
				'link',
				'unlink',
				'blockquote',
				'h2',
				'h3'
			);

			$tinymce_blocks = array(
				'wp_media',
				'hr',
				'wp_more',
				'wp_page'
			);

			$tinymce = array(
				'selector' => '#fee-mce-' . $post->ID,
				'plugins' => implode( ' ', array_unique( apply_filters( 'fee_tinymce_plugins', $tinymce_plugins ) ) ),
				'toolbar' => apply_filters( 'fee_tinymce_toolbar', $tinymce_toolbar ),
				'blocks' => apply_filters( 'fee_tinymce_blocks', $tinymce_blocks ),
				'theme' => 'fee',
				'inline' => true,
				'relative_urls' => false,
				'convert_urls' => false,
				'browser_spellcheck' => true,
				'placeholder' => apply_filters( 'fee_content_placeholder', __( 'Just write&hellip;' ) ),
				'wpeditimage_html5_captions' => current_theme_supports( 'html5', 'caption' )
			);

			wp_enqueue_script( 'wp-lists' );
			wp_localize_script( 'wp-lists', 'ajaxurl', admin_url( 'admin-ajax.php' ) );

			wp_enqueue_script( 'fee', $this->url( '/js/fee' . $suffix . '.js' ), array( 'fee-tinymce', 'wp-util', 'heartbeat', 'editor', 'wp-lists' ), $this->package['version'], true );
			wp_localize_script( 'fee', 'fee', array(
				'tinymce' => apply_filters( 'fee_tinymce_config', $tinymce ),
				'postOnServer' => $post,
				'permalink' => $this->get_sample_permalink( $post->ID ),
				'nonces' => array(
					'post' => wp_create_nonce( 'update-post_' . $post->ID ),
					'slug' => wp_create_nonce( 'slug-nonce_' . $post->ID ),
					'categories' => wp_create_nonce( 'fee-categories_' . $post->ID )
				),
				'lock' => ! wp_check_post_lock( $post->ID ) ? implode( ':', wp_set_post_lock( $post->ID ) ) : false,
				'notices' => array(
					'autosave' => $this->get_autosave_notice()
				),
				'postTaxOnServer' => $this->get_post_tax_and_terms(),
				'taxonomies' => $this->get_tax_and_terms()
			) );
			wp_localize_script( 'fee', 'feeL10n', array(
				'saveAlert' => __( 'The changes you made will be lost if you navigate away from this page.' ),
				'title' => apply_filters( 'fee_title_placeholder', __( 'Title' ) )
			) );

			wp_enqueue_media( array( 'post' => $post ) );

			wp_enqueue_script( 'mce-view-register', $this->url( '/js/mce-view-register' . $suffix . '.js' ), array( 'mce-view', 'fee' ), $this->package['version'], true );

			wp_enqueue_script( 'wplink' );
			wp_localize_script( 'wplink', 'ajaxurl', admin_url( 'admin-ajax.php' ) );

			wp_enqueue_script( 'fee-modal', $this->url( '/js/modal' . $suffix . '.js' ), array( 'jquery' ), $this->package['version'], true );
			wp_enqueue_style( 'fee-modal' , $this->url( '/css/modal.css' ), false, $this->package['version'], 'screen' );

			wp_enqueue_style( 'fee-link-modal' , $this->url( '/css/link-modal.css' ), false, $this->package['version'], 'screen' );
			wp_enqueue_style( 'tinymce-core' , $this->url( '/css/tinymce.core.css' ), false, $this->package['version'], 'screen' );
			wp_enqueue_style( 'tinymce-view' , $this->url( '/css/tinymce.view.css' ), false, $this->package['version'], 'screen' );
			wp_enqueue_style( 'fee' , $this->url( '/css/fee.css' ), false, $this->package['version'], 'screen' );
			wp_enqueue_style( 'dashicons' );
		}

		if ( current_user_can( 'edit_posts' ) ) {
			if ( is_singular() ) {
				require_once( ABSPATH . '/wp-admin/includes/post.php' );

				$user_id = wp_check_post_lock( $post->ID );
				$user = get_userdata( $user_id );
			}

			wp_enqueue_style( 'fee-adminbar', $this->url( '/css/fee-adminbar.css' ), false, $this->package['version'], 'screen' );
			wp_enqueue_script( 'fee-adminbar', $this->url( '/js/fee-adminbar' . $suffix . '.js' ), array( 'wp-util' ), $this->package['version'], true );
			wp_localize_script( 'fee-adminbar', 'fee', array(
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
		add_filter( 'the_category', array( $this, 'the_category' ), 10, 3 );
		add_filter( 'private_title_format', array( $this, 'private_title_format' ), 10, 2 );
		add_filter( 'protected_title_format', array( $this, 'private_title_format' ), 10, 2 );

		add_action( 'wp_before_admin_bar_render', array( $this, 'wp_before_admin_bar_render' ) );

		add_action( 'wp_print_footer_scripts', 'wp_auth_check_html' );
		add_action( 'wp_print_footer_scripts', array( $this, 'footer' ) );
		add_action( 'wp_print_footer_scripts', array( $this, 'link_modal' ) );

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

	function the_category( $thelist, $separator = '', $parents = '' ) {
		if (
			is_main_query() &&
			in_the_loop() &&
			$this->did_action( 'wp_head' )
		) {
			$thelist = '<div class="fee-categories" data-separator="' . urlencode( $separator ) . '" data-parents="' . urlencode( $parents ) . '">' . $thelist . '</div>';
		}

		return $thelist;
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
				'href' => '#'
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

	function footer() {
		global $post;

		$post_type = $post->post_type;
		$post_type_object = get_post_type_object( $post_type );
		$can_publish = current_user_can( $post_type_object->cap->publish_posts );

		?>
		<div class="wp-core-ui">
			<div id="fee-notice-area" class="wp-core-ui">
				<div id="lost-connection-notice" class="error hidden">
					<p><span class="spinner"></span> <?php _e( '<strong>Connection lost.</strong> Saving has been disabled until you&#8217;re reconnected.' ); ?>
					<span class="hide-if-no-sessionstorage"><?php _e( 'We&#8217;re backing up this post in your browser, just in case.' ); ?></span>
					</p>
				</div>
			</div>
			<div id="local-storage-notice" class="hidden">
				<p class="local-restore">
					<?php _e( 'The backup of this post in your browser is different from the version below.' ); ?> <a class="restore-backup" href="#"><?php _e( 'Restore the backup.' ); ?></a>
				</p>
				<p class="undo-restore hidden">
					<?php _e( 'Post restored successfully.' ); ?> <a class="undo-restore-backup" href="#"><?php _e( 'Undo.' ); ?></a>
				</p>
				<div class="dashicons dashicons-dismiss"></div>
			</div>
			<input type="hidden" id="post_ID" name="post_ID" value="<?php echo $post->ID; ?>">
			<div class="fee-alert fee-leave">
				<div class="fee-alert-body">
					<p><?php _e( 'The changes you made will be lost if you navigate away from this page.' ); ?></p>
					<button class="button fee-cancel">Cancel</button>
					<?php if ( in_array( $post->post_status, array( 'auto-draft', 'draft', 'pending' ) ) ) { ?>
						<button class="button fee-save-and-exit"><?php _e( 'Save and leave' ); ?></button>
					<?php } else { ?>
						<button class="button fee-save-and-exit"><?php _e( 'Update and leave' ); ?></button>
					<?php } ?>
					<button class="button button-primary fee-exit">Leave</button>
				</div>
			</div>
			<?php
			require( ABSPATH  . '/wp-admin/includes/meta-boxes.php' );

			$taxonomies = get_object_taxonomies( $post );

			if ( is_array( $taxonomies ) ) {
				foreach ( $taxonomies as $tax_name ) {
					$taxonomy = get_taxonomy( $tax_name );

					if ( ! $taxonomy->show_ui || false === $taxonomy->meta_box_cb ) {
						continue;
					}

					?>
					<div class="modal fee-<?php echo $tax_name; ?>-modal" tabindex="-1" role="dialog" aria-hidden="true">
						<div class="modal-dialog modal-sm">
							<div class="modal-content">
								<div class="modal-header">
									<button data-dismiss="modal" style="float: right;"><span aria-hidden="true">&times;</span><span class="sr-only"><?php _e( 'Close' ); ?></span></button>
									<div class="modal-title" id="myModalLabel"><?php echo $taxonomy->labels->name; ?></div>
								</div>
								<div class="modal-body">
									<?php call_user_func( $taxonomy->meta_box_cb, $post, array( 'args' => array( 'taxonomy' => $tax_name ) ) ); ?>
								</div>
								<div class="modal-footer">
									<button class="button button-primary" data-dismiss="modal"><?php _e( 'Close' ); ?></button>
								</div>
							</div>
						</div>
					</div>
					<?php
				}
			}
			?>
		</div>
		<?php
	}

	function link_modal() {
		if ( ! class_exists( '_WP_Editors' ) ) {
			require( ABSPATH . WPINC . '/class-wp-editor.php' );
		}

		_WP_Editors::wp_link_dialog();
	}

	function get_message( $post, $message_id, $revision_id = null ) {
		$messages = array();

		$messages['post'] = array(
			 0 => '', // Unused. Messages start at index 1.
			 1 => __( 'Post updated.' ),
			 2 => __( 'Custom field updated.' ),
			 3 => __( 'Custom field deleted.' ),
			 4 => __( 'Post updated.' ),
			/* translators: %s: date and time of the revision */
			 5 => isset( $revision_id ) ? sprintf( __( 'Post restored to revision from %s' ), wp_post_revision_title( (int) $revision_id, false ) ) : false,
			 6 => __( 'Post published.' ),
			 7 => __( 'Post saved.' ),
			 8 => __( 'Post submitted.' ),
			 9 => sprintf( __( 'Post scheduled for: <strong>%1$s</strong>.' ),
				// translators: Publish box date format, see http://php.net/date
				date_i18n( __( 'M j, Y @ G:i' ), strtotime( $post->post_date ) ) ),
			10 => __( 'Post draft updated.' )
		);

		$messages['page'] = array(
			 0 => '', // Unused. Messages start at index 1.
			 1 => __( 'Page updated.' ),
			 2 => __( 'Custom field updated.' ),
			 3 => __( 'Custom field deleted.' ),
			 4 => __( 'Page updated.' ),
			 5 => isset( $revision_id ) ? sprintf( __( 'Page restored to revision from %s' ), wp_post_revision_title( (int) $revision_id, false ) ) : false,
			 6 => __( 'Page published.' ),
			 7 => __( 'Page saved.' ),
			 8 => __( 'Page submitted.' ),
			 9 => sprintf( __( 'Page scheduled for: <strong>%1$s</strong>.' ), date_i18n( __( 'M j, Y @ G:i' ), strtotime( $post->post_date ) ) ),
			10 => __( 'Page draft updated.' )
		);

		$messages['attachment'] = array_fill( 1, 10, __( 'Media attachment updated.' ) ); // Hack, for now.

		$messages = apply_filters( 'post_updated_messages', $messages );

		return $messages[ $post->post_type ] ? $messages[ $post->post_type ][ $message_id ] : $messages[ 'post' ][ $message_id ];
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

	function get_tax_and_terms( $post = null ) {
		$tax_info = array();
		$taxonomies = get_object_taxonomies( get_post( $post ) );

		if ( is_array( $taxonomies ) ) {
			foreach ( $taxonomies as $taxonomy ) {
				$tax_info[ $taxonomy ] = array(
					'labels' => get_taxonomy( $taxonomy )->labels,
					'terms' => get_terms( $taxonomy )
				);
			}
		}

		return $tax_info;
	}

	function get_post_tax_and_terms( $post = null ) {
		$tax_info = array();
		$post = get_post( $post );

		foreach ( get_object_taxonomies( $post ) as $taxonomy ) {
			$tax_info[ $taxonomy ] = array();

			$terms = get_the_terms( $post->ID, $taxonomy );

			if ( is_array( $terms ) ) {
				foreach ( $terms as $term ) {
					$tax_info[ $taxonomy ][] = $term->term_id;
				}
			}
		}

		return $tax_info;
	}

	function did_action( $tag ) {
		return did_action( $tag ) - (int) doing_filter( $tag );
	}

	function edit_link( $id ) {
		if ( get_queried_object_id() === $id ) {
			return '#fee-edit-link';
		}

		return $this->add_hash_arg( array( 'edit' => 'true' ), get_permalink( $id ) );
	}

	function add_hash_arg( $array, $uri ) {
		if ( 0 === stripos( $uri, 'http://' ) ) {
			$protocol = 'http://';
			$uri = substr( $uri, 7 );
		} elseif ( 0 === stripos( $uri, 'https://' ) ) {
			$protocol = 'https://';
			$uri = substr( $uri, 8 );
		} else {
			$protocol = '';
		}

		if ( strpos( $uri, '#' ) !== false ) {
			list( $base, $query ) = explode( '#', $uri, 2 );
			$base .= '#';
		} elseif ( $protocol || strpos( $uri, '=' ) === false ) {
			$base = $uri . '#';
			$query = '';
		} else {
			$base = '';
			$query = $uri;
		}

		wp_parse_str( $query, $qs );

		$qs = urlencode_deep( $qs ); // this re-URL-encodes things that were already in the query string
		$qs = array_merge( $qs, $array );

		foreach ( $qs as $k => $v ) {
			if ( $v === false ) {
				unset( $qs[ $k ] );
			}
		}

		$return = build_query( $qs );
		$return = trim( $return, '#' );
		$return = preg_replace( '#=(&|$)#', '$1', $return );
		$return = $protocol . $base . $return;
		$return = rtrim( $return, '#' );

		return $return;
	}

	function get_sample_permalink( $post ) {
		$_post = get_post( $post );
		$_post->post_status = 'published';

		$sample = get_sample_permalink( $_post );

		return $sample[0];
	}
}
