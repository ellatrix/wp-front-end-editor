<?php

class WP_Front_End_Editor {

	const VERSION = '0.10';
	const PLUGIN = 'wp-front-end-editor/wp-front-end-editor.php';

	private static $instance;
	
	private $wp_fee;

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

		if ( $id == get_option( 'page_on_front' ) ) {

			$link = home_url( '?editing' );

		} else {

			$permalink = get_permalink( $post->ID );

			if ( strpos( $permalink, '?' ) !== false )

				$link = add_query_arg( 'edit', '', $permalink );

			if ( trailingslashit( $permalink ) === $permalink )

				$link = trailingslashit( $permalink . 'edit' );

			if ( ! isset( $link ) )

				$link = trailingslashit( $permalink ) . 'edit';

		}

		if ( force_ssl_admin() )

			$link = set_url_scheme( $link, 'https' );

		return $link;

	}

	public static function instance() {

		if ( ! self::$instance )

			self::$instance = new self;

		return self::$instance;

	}

	private function __construct() {

		global $wp_version;

		if ( empty( $wp_version )
			|| version_compare( $wp_version, '3.9', '<' )
			|| version_compare( $wp_version, '4.0-alpha', '>' ) ) {

			add_action( 'admin_notices', array( $this, 'admin_notices' ) );

			return;

		}

		register_activation_hook( self::PLUGIN, array( $this, 'activate' ) );

		add_action( 'init', array( $this, 'init' ) );

	}

	public function admin_notices() {

		echo '<div class="error"><p><strong>WordPress Front-end Editor</strong> currently only works between versions 3.9 and 4.0-alpha.</p></div>';

	}

	public function activate() {

		add_rewrite_endpoint( 'edit', EP_PERMALINK | EP_PAGES | EP_ROOT );

		flush_rewrite_rules();

	}

	public function init() {

		global $wp_post_statuses;

		if ( ! is_admin() && ! empty( $_GET['trashed'] ) && $_GET['trashed'] === '1' && ! empty( $_GET['ids'] ) ) {

			wp_redirect( admin_url( 'edit.php?post_type=' . get_post_type( $_GET['ids'] ) . '&trashed=1&ids=' . $_GET['ids'] ) );

			die;

		}

		// Lets auto-drafts pass as drafts by WP_Query.
		$wp_post_statuses['auto-draft']->protected = true;

		add_rewrite_endpoint( 'edit', EP_PERMALINK | EP_PAGES | EP_ROOT );

		add_post_type_support( 'post', 'front-end-editor' );
		add_post_type_support( 'page', 'front-end-editor' );

		add_action( 'wp', array( $this, 'wp' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );

		if ( isset( $_POST['wp_fee_redirect'] )
			&& $_POST['wp_fee_redirect'] == '1' )

			add_filter( 'redirect_post_location', array( $this, 'redirect_post_location' ), 10, 2 );

		add_filter( 'admin_post_thumbnail_html', array( $this, 'admin_post_thumbnail_html' ), 10, 2 );

		add_action( 'wp_ajax_wp_fee_post', array( $this, 'wp_fee_post' ) );
		add_action( 'wp_ajax_wp_fee_shortcode', array( $this, 'wp_fee_shortcode' ) );
		add_action( 'wp_ajax_wp_fee_embed', array( $this, 'wp_fee_embed' ) );
		add_action( 'wp_ajax_wp_fee_new', array( $this, 'wp_fee_new' ) );
		
		add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ) );

		add_filter( 'get_edit_post_link', array( $this, 'get_edit_post_link' ), 10, 3 );
		add_filter( 'edit_post_link', array( $this, 'edit_post_link' ), 10, 2 );
		add_filter( 'admin_url', array( $this, 'admin_url' ) );

	}

	public function wp() {

		global $post, $post_type, $post_type_object;

		add_filter( 'body_class', array( $this, 'body_class' ) );

		if ( ! empty( $_GET['get-post-lock'] ) ) {

			require_once( ABSPATH . '/wp-admin/includes/post.php' );

			wp_set_post_lock( $post->ID );

			wp_redirect( $this->edit_link( $post->ID ) );

			die();

		}

		if ( ! $this->is_edit() )

			return;

		if ( force_ssl_admin()
			&& ! is_ssl() ) {

			wp_redirect( set_url_scheme( get_permalink( $post->ID ), 'https' ) );

			die();

		}

		if ( ! $post )

			wp_die( __( 'You attempted to edit an item that doesn&#8217;t exist. Perhaps it was deleted?' ) );

		if ( ! post_type_supports( $post->post_type, 'front-end-editor' ) ) {

			wp_redirect( get_permalink( $post->ID ) );

			die();

		}

		if ( ! is_user_logged_in() ) {

			wp_redirect( wp_login_url( $this->edit_link( $post->ID ) ) );

			die();

		}

		if ( ! current_user_can( 'edit_post', $post->ID ) )

			wp_die( __( 'You are not allowed to edit this item.' ) );

		if ( $post->post_status === 'auto-draft' ) {

			$post->post_title = '';
			$post->comment_status = get_option( 'default_comment_status' );
			$post->ping_status = get_option( 'default_ping_status' );

		}

		$post_type = $post->post_type;
		$post_type_object = get_post_type_object( $post_type );

		require_once( ABSPATH . '/wp-admin/includes/admin.php' );
		require_once( ABSPATH . '/wp-admin/includes/meta-boxes.php' );

		add_theme_support( 'admin-bar', array( 'callback' => array( $this, '_admin_bar_bump_cb' ) ) );

		add_filter( 'show_admin_bar', '__return_true' );

		add_action( 'wp_head', array( $this, 'wp_head' ) );
		add_action( 'wp_print_footer_scripts', 'wp_auth_check_html' );
		add_action( 'wp_print_footer_scripts', array( $this, 'meta_modal' ) );
		add_action( 'wp_print_footer_scripts', array( $this, 'link_modal' ) );
		add_action( 'admin_bar_menu', array( $this, 'admin_bar_menu' ), 10 );
		add_action( 'wp_before_admin_bar_render', array( $this, 'wp_before_admin_bar_render' ), 100 );

		add_filter( 'post_class', array( $this, 'post_class' ) );
		add_filter( 'the_title', array( $this, 'the_title' ) );
		add_filter( 'the_content', array( $this, 'the_content' ), 20 );
		add_filter( 'wp_link_pages', '__return_empty_string', 20 );
		add_filter( 'post_thumbnail_html', array( $this, 'post_thumbnail_html' ), 10, 5 );
		add_filter( 'get_post_metadata', array( $this, 'get_post_metadata' ), 10, 4 );

		$check_users = get_users( array( 'fields' => 'ID', 'number' => 2 ) );

		if ( count( $check_users ) > 1 )

			add_action( 'wp_print_footer_scripts', '_admin_notice_post_locked' );

		unset( $check_users );

	}

	public function get_edit_post_link( $link, $id, $context ) {

		global $pagenow;

		$post = get_post( $id );

		if ( $post->post_type === 'revision'
			|| ! empty( $this->wp_fee['admin_edit_link'] ) )

			return add_query_arg( 'redirect', 'front', $link );

		if ( $this->is_edit() )

			return get_permalink( $id );

		if ( post_type_supports( $post->post_type, 'front-end-editor' )
			&& ( ! is_admin()
				|| ( $pagenow === 'revision.php'
					&& isset( $_GET['redirect'] )
					&& $_GET['redirect'] === 'front' ) ) )

			return $this->edit_link( $id );

		return $link;

	}

	public function edit_post_link( $link, $id ) {

		require_once( ABSPATH . '/wp-admin/includes/post.php' );

		if ( $this->is_edit() )

			return '<a class="post-edit-link" href="' . get_permalink( $id ) . '">' . __( 'Cancel' ) . '</a>';

		if ( wp_check_post_lock( $id ) )

			return '<a class="post-edit-link" href="' . $this->edit_link( $id ) . '">' . __( 'LOCKED' ) . '</a>';

		return $link;

	}
	
	public function admin_url( $url ) {

		global $pagenow;

		if ( $pagenow === 'revision.php'
			&& isset( $_GET['redirect'] )
			&& $_GET['redirect'] === 'front' )

			return add_query_arg( 'redirect', 'front', $url );

		return $url;

	}

	public function wp_head() {

		global $post, $post_type, $wp_locale, $hook_suffix, $current_screen;

		set_current_screen( $post_type );

		$admin_body_class = preg_replace( '/[^a-z0-9_-]+/i', '-', $hook_suffix );

		?><script type="text/javascript">
		addLoadEvent = function(func){if(typeof jQuery!="undefined")jQuery(document).ready(func);else if(typeof wpOnload!='function'){wpOnload=func;}else{var oldonload=wpOnload;wpOnload=function(){oldonload();func();}}};
		var ajaxurl = '<?php echo admin_url( 'admin-ajax.php' ); ?>',
			pagenow = '<?php echo $current_screen->id; ?>',
			typenow = '<?php echo $current_screen->post_type; ?>',
			adminpage = '<?php echo $admin_body_class; ?>',
			thousandsSeparator = '<?php echo addslashes( $wp_locale->number_format['thousands_sep'] ); ?>',
			decimalPoint = '<?php echo addslashes( $wp_locale->number_format['decimal_point'] ); ?>',
			isRtl = <?php echo (int) is_rtl(); ?>;
		</script><?php

		unset( $GLOBALS['current_screen'] );

	}

	public function wp_enqueue_scripts() {

		global $post, $wp_version, $tinymce_version, $concatenate_scripts, $compress_scripts;

		if ( ! isset($concatenate_scripts) )
			script_concat_settings();

		$compressed = $compress_scripts && $concatenate_scripts && isset( $_SERVER['HTTP_ACCEPT_ENCODING'] )
			&& false !== stripos( $_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip' );

		$suffix = ( defined('SCRIPT_DEBUG') && SCRIPT_DEBUG ) ? '' : '.min';

		if ( $this->is_edit() ) {
			
			wp_enqueue_style( 'wp-core-ui' , $this->url( '/css/wp-core-ui.css' ), false, self::VERSION, 'screen' );
			wp_enqueue_style( 'wp-core-ui-colors' , $this->url( '/css/wp-core-ui-colors.css' ), false, self::VERSION, 'screen' );
			wp_enqueue_style( 'buttons' );
			wp_enqueue_style( 'wp-auth-check' );

			wp_enqueue_script( 'jquery' );
			wp_enqueue_script( 'jquery-ui-selectable' );
			wp_enqueue_script( 'tipsy', $this->url( 'js/jquery.tipsy.js' ), array( 'jquery' ), self::VERSION, true );
			wp_enqueue_script( 'heartbeat' );
			wp_enqueue_script( 'postbox', admin_url( 'js/postbox.js' ), array( 'jquery-ui-sortable' ), self::VERSION, true );
			wp_enqueue_script( 'post-custom', $this->url( '/js/post.js' ), array( 'suggest', 'wp-lists', 'postbox', 'heartbeat', 'utils' ), self::VERSION, true );

			$vars = array(
				'ok' => __( 'OK' ),
				'cancel' => __( 'Cancel' ),
				'publishOn' => __( 'Publish on:' ),
				'publishOnFuture' =>  __( 'Schedule for:' ),
				'publishOnPast' => __( 'Published on:' ),
				'dateFormat' => __( '%1$s %2$s, %3$s @ %4$s : %5$s' ),
				'showcomm' => __( 'Show more comments' ),
				'endcomm' => __( 'No more comments found.' ),
				'publish' => __( 'Publish' ),
				'schedule' => __( 'Schedule' ),
				'update' => __( 'Update' ),
				'savePending' => __( 'Save as Pending' ),
				'saveDraft' => __( 'Save Draft' ),
				'private' => __( 'Private' ),
				'public' => __( 'Public' ),
				'publicSticky' => __( 'Public, Sticky' ),
				'password' => __( 'Password Protected' ),
				'privatelyPublished' => __( 'Privately Published' ),
				'published' => __( 'Published' ),
				'comma' => _x( ',', 'tag delimiter' )
			);

			wp_localize_script( 'post-custom', 'postL10n', $vars );

			wp_enqueue_script( 'wp-auth-check' );
			wp_enqueue_script( 'autosave-custom', $this->url( '/js/autosave.js' ), array( 'schedule', 'wp-ajax-response' ), self::VERSION, true );

			wp_localize_script( 'autosave-custom', 'autosaveL10n', array(
				'autosaveInterval' => AUTOSAVE_INTERVAL,
				'blog_id' => get_current_blog_id()
			) );

			// Load tinymce.js when running from /src, else load wp-tinymce.js.gz (production) or tinymce.min.js (SCRIPT_DEBUG)
			$mce_suffix = false !== strpos( $wp_version, '-src' ) ? '' : '.min';

			if ( $compressed ) {

				wp_enqueue_script( 'wp-fee-tinymce-compressed', includes_url( 'js/tinymce' ) . '/wp-tinymce.php?c=1', array(), $tinymce_version, true );

			} else {

				wp_enqueue_script( 'wp-fee-tinymce', includes_url( 'js/tinymce' ) . '/tinymce' . $mce_suffix . '.js', array(), $tinymce_version, true );
				wp_enqueue_script( 'wp-fee-tinymce-compat3x', includes_url( 'js/tinymce' ) . '/plugins/compat3x/plugin' . $suffix . '.js', array( 'wp-fee-tinymce' ), $tinymce_version, true );

			}

			wp_enqueue_script( 'tinymce-fee', $this->url( '/js/tinymce.fee.js' ), array( 'wp-fee-tinymce' ), self::VERSION, true );
			wp_enqueue_script( 'tinymce-link', $this->url( '/js/tinymce.link.js' ), array( 'wp-fee-tinymce' ), self::VERSION, true );
			wp_enqueue_script( 'tinymce-more', $this->url( '/js/tinymce.more.js' ), array( 'wp-fee-tinymce' ), self::VERSION, true );
			wp_enqueue_script( 'tinymce-blocks', $this->url( '/js/tinymce.blocks.js' ), array( 'wp-fee-tinymce' ), self::VERSION, true );

			wp_enqueue_script( 'tinymce-table', $this->url( '/js/tinymce/plugins/table/plugin' . $suffix . '.js' ), array( 'wp-fee-tinymce' ), $tinymce_version, true );
			wp_enqueue_script( 'tinymce-noneditable', $this->url( '/js/tinymce/plugins/noneditable/plugin' . $suffix . '.js' ), array( 'wp-fee-tinymce' ), $tinymce_version, true );

			wp_enqueue_script( 'wp-front-end-editor', $this->url( '/js/wp-front-end-editor.js' ), array( 'wp-fee-tinymce' ), self::VERSION, true );

			$tinymce_plugins = array(
				'wpkitchensink',
				'wpblocks',
				'wpmore',
				'wplink',
				'paste',
				'table',
				'noneditable',
				'hr'
			);

			$tinymce_buttons_1 = array(
				'kitchensink',
				'formatselect',
				'bold',
				'italic',
				'strikethrough',
				'blockquote',
				'alignleft',
				'aligncenter',
				'alignright',
				'wp_more',
				'link',
				'media',
				'undo',
				'redo'
			);

			$tinymce_buttons_2 = array(
				'kitchensink',
				'removeformat',
				'pastetext',
				'hr',
				'bullist',
				'numlist',
				'outdent',
				'indent',
//				'table',
				'undo',
				'redo'
			);

			$tinymce = array(
				'selector' => '#wp-fee-content-' . $post->ID,
				'inline' => true,
				'plugins' => implode( ' ', array_unique( apply_filters( 'wp_fee_tinymce_plugins', $tinymce_plugins ) ) ),
				'toolbar1' => implode( ' ', apply_filters( 'wp_fee_tinymce_buttons_1', $tinymce_buttons_1 ) ),
				'toolbar2' => implode( ' ', apply_filters( 'wp_fee_tinymce_buttons_2', $tinymce_buttons_2 ) ),
				'toolbar3' => implode( ' ', apply_filters( 'wp_fee_tinymce_buttons_3', array() ) ),
				'toolbar4' => implode( ' ', apply_filters( 'wp_fee_tinymce_buttons_4', array() ) ),
				'menubar' => false,
				'fixed_toolbar_container' => '#wp-admin-bar-wp-fee-mce-toolbar',
				'skin' => false,
				'object_resizing' => false,
				'relative_urls' => false,
				'convert_urls' => false,
				'browser_spellcheck' => true,
				'valid_children' => '+div[style],+div[script]'
			);

			$wpfee = array(
				'postTitle' => get_the_title(),
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'redirectPostLocation' => esc_url( apply_filters( 'redirect_post_location', '', $post->ID ) ),
				'blankGif' => includes_url( '/images/blank.gif' ),
				'tinymce' => apply_filters( 'wp_fee_tinymce_config', $tinymce )
			);

			wp_localize_script( 'wp-front-end-editor', 'wpFee', $wpfee );
			
			wp_localize_script( 'wp-front-end-editor', 'autosaveL10n', array(
				'autosaveInterval' => AUTOSAVE_INTERVAL,
				'savingText' => __( 'Saving Draft&#8230;' ),
				'saveAlert' => __( 'The changes you made will be lost if you navigate away from this page.' ),
				'blog_id' => get_current_blog_id()
			) );

			wp_enqueue_media( array( 'post' => $post ) );

			wp_enqueue_script( 'wp-link', $this->url( '/js/wp-link.js' ), array( 'jquery' ), self::VERSION, true );

			wp_localize_script( 'wp-link', 'wpLinkL10n', array(
				'title' => __('Insert/edit link'),
				'update' => __('Update'),
				'save' => __('Add Link'),
				'noTitle' => __('(no title)'),
				'noMatchesFound' => __('No matches found.')
			) );

			wp_enqueue_style( 'wp-fee-link-modal' , $this->url( '/css/link-modal.css' ), false, self::VERSION, 'screen' );

			wp_enqueue_style( 'wp-fee' , $this->url( '/css/wp-fee.css' ), false, self::VERSION, 'screen' );

			wp_enqueue_style( 'dashicons' );

		} elseif ( is_user_logged_in() ) {

			wp_enqueue_style( 'wp-fee-adminbar' , $this->url( '/css/wp-fee-adminbar.css' ), false, self::VERSION, 'screen' );

			wp_enqueue_script( 'tipsy', $this->url( 'js/jquery.tipsy.js' ), array( 'jquery' ), self::VERSION, true );
			wp_enqueue_script( 'wp-fee-adminbar', $this->url( '/js/wp-fee-adminbar.js' ), array( 'jquery' ), self::VERSION, true );

			if ( is_singular() ) {

				require_once( ABSPATH . '/wp-admin/includes/post.php' );

				$user_id = wp_check_post_lock( $post->ID );
				$user = get_userdata( $user_id );

			}

			$vars = array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'homeUrl' => home_url( '/' ),
				'lock' => ( is_singular() && $user_id ) ? $user->display_name : false
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
				'title' => 'Cancel (esc)'
			),
			'fee' => true
		) );

		$this->wp_fee['admin_edit_link'] = true;

		$wp_admin_bar->add_node( array(
			'id' => 'wp-fee-backend',
			'href' => get_edit_post_link( $post->ID ),
			'parent' => 'top-secondary',
			'title' => '<span class="ab-icon"></span>',
			'meta' => array(
				'title' => 'Edit in admin'
			),
			'fee' => true
		) );

		$this->wp_fee['admin_edit_link'] = false;

		if ( $unpublished = in_array( $post->post_status, array( 'auto-draft', 'draft', 'pending' ) ) ) {

			$wp_admin_bar->add_node( array(
				'id' => 'wp-fee-publish',
				'parent' => 'top-secondary',
				'title' => '<span id="wp-fee-publish" class="wp-fee-submit button button-primary" title="' . __( 'Publish' ) . ' (ctrl + S)" data-default="' . __( 'Publish' ) . '" data-working="' . __( 'Publishing&hellip;' ) . '">' . __( 'Publish' ) . '</span>',
				'meta' => array(
					'class' => 'wp-core-ui'
				),
				'fee' => true
			) );

		}

		$wp_admin_bar->add_node( array(
			'id' => 'wp-fee-save',
			'parent' => 'top-secondary',
			'title' => '<span id="wp-fee-save" class="wp-fee-submit button' . ( $unpublished ? '' : ' button-primary' ) . '" title="' . ( $unpublished ? __( 'Save' ) : __( 'Update' ) ) . ' (ctrl + S)" data-default="' . ( $unpublished ? __( 'Save' ) : __( 'Update' ) ) . '" data-working="' . ( $unpublished ? __( 'Saving&hellip;' ) : __( 'Updating&hellip;' ) ) . '">' . ( $unpublished ? __( 'Save' ) : __( 'Update' ) ) . '</span>',
			'meta' => array(
				'class' => 'wp-core-ui'
			),
			'fee' => true
		) );

		if ( current_user_can( 'delete_post', $post->ID ) ) {

			$wp_admin_bar->add_node( array(
				'id' => 'wp-fee-delete',
				'href' => get_delete_post_link( $post->ID ),
				'parent' => 'top-secondary',
				'title' => '<span class="ab-icon dashicons dashicons-trash"></span>',
				'meta' => array(
					'title' => EMPTY_TRASH_DAYS ? __( 'Move to Trash' ) : __( 'Delete Permanently' )
				),
				'fee' => true
			) );

		}

		$wp_admin_bar->add_node( array(
			'id' => 'wp-fee-meta',
			'href' => '#',
			'parent' => 'top-secondary',
			'title' => '<span class="ab-icon"></span>',
			'meta' => array(
				'title' => 'More options'
			),
			'fee' => true
		) );

		$taxonomies = get_object_taxonomies( $post );

		if ( in_array( 'post_tag', $taxonomies ) ) {

			$wp_admin_bar->add_node( array(
				'id' => 'wp-fee-tags',
				'href' => '#',
				'parent' => 'top-secondary',
				'title' => '<span class="ab-icon"></span>',
				'meta' => array(
					'title' => 'Manage tags'
				),
				'fee' => true
			) );

		}

		if ( in_array( 'category', $taxonomies ) ) {

			$wp_admin_bar->add_node( array(
				'id' => 'wp-fee-cats',
				'href' => '#',
				'parent' => 'top-secondary',
				'title' => '<span class="ab-icon"></span>',
				'meta' => array(
					'title' => 'Manage categories'
				),
				'fee' => true
			) );

		}

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

	public function post_class( $classes ) {

		$classes[] = 'wp-fee-post';

		return $classes;

	}

	public function body_class( $classes ) {

		global $post;

		if ( $this->is_edit() ) {

			$classes[] = 'wp-fee-body';
			$classes[] = esc_attr( 'wp-fee-status-' . $post->post_status );

		}

		require_once( ABSPATH . '/wp-admin/includes/post.php' );

		if ( is_singular()
			&& wp_check_post_lock( $post->ID ) )

			$classes[] = 'wp-fee-locked';

		return $classes;

	}

	public function the_title( $title ) {

		if ( empty( $title ) )

			$title = ' ';

		return $title;

	}

	public function the_content( $content ) {

		global $post;

		if ( is_main_query()
			&& in_the_loop()
			&& $this->really_did_action( 'wp_head' )
			&& empty( $this->wp_fee['the_content'] ) ) {

			$this->wp_fee['the_content'] = true;

			if ( $post->post_status === 'auto-draft' ) {

				$content = apply_filters( 'default_content', '', $post );

			} else {

				$content = $post->post_content;

			}

			$content = $this->autoembed( $content );
			$content = wpautop( $content );
			$content = shortcode_unautop( $content );
			$content = $this->do_shortcode( $content );
			$content = '<div class="wp-fee-content-holder"><p class="wp-fee-content-placeholder">&hellip;</p><div id="wp-fee-content-' . $post->ID . '" class="wp-fee-content">' . $content . '</div></div>';

		}

		return $content;

	}

	public function post_thumbnail_html( $html, $post_id, $post_thumbnail_id, $size, $attr ) {

		global $post, $wp_the_query;

		if ( is_main_query()
			&& in_the_loop()
			&& $wp_the_query->queried_object->ID === $post_id
			&& $this->really_did_action( 'wp_head' )
			&& empty( $this->wp_fee['the_post_thumbnail'] ) ) {

			$this->wp_fee['the_post_thumbnail'] = true;

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
					<div class="wp-core-ui"><a href="#" class="wp-fee-set-post-thumbnail">Add a featured image</a></div>
				</div>
			</div>
			';

		}

	}

	// Not sure if this is a good idea, this could have unexpected consequences. But otherwise nothing shows up if the featured image is set in edit mode.
	public function get_post_metadata( $n, $object_id, $meta_key, $single ) {

		global $wp_the_query;

		if ( is_main_query()
			&& in_the_loop()
			&& $wp_the_query->queried_object->ID === $object_id
			&& $this->really_did_action( 'wp_head' )
			&& $meta_key === '_thumbnail_id'
			&& $single
			&& empty( $this->wp_fee['filtering_get_post_metadata'] ) ) {

			$this->wp_fee['filtering_get_post_metadata'] = true;

			$thumbnail_id = get_post_thumbnail_id( $object_id );

			$this->wp_fee['filtering_get_post_metadata'] = false;

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

		require_once( ABSPATH . '/wp-admin/includes/post.php' );

		if ( ! wp_verify_nonce( $_POST['_wpnonce'], 'update-post_' . $_POST['post_ID'] ) )

			$this->response( __( 'You are not allowed to edit this item.' ) );

		$_POST['post_title'] = strip_tags( $_POST['post_title'] );

		$post_id = edit_post();
		
		if ( isset($_POST['save']) || isset($_POST['publish']) ) {
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
					$message = 'draft' == $status ? 10 : 1;
			}
	
			$location = add_query_arg( 'message', $message, $this->edit_link( $post_id ) );
		} elseif ( isset($_POST['addmeta']) && $_POST['addmeta'] ) {
			$location = add_query_arg( 'message', 2, wp_get_referer() );
			$location = explode('#', $location);
			$location = $location[0] . '#postcustom';
		} elseif ( isset($_POST['deletemeta']) && $_POST['deletemeta'] ) {
			$location = add_query_arg( 'message', 3, wp_get_referer() );
			$location = explode('#', $location);
			$location = $location[0] . '#postcustom';
		} else {
			$location = add_query_arg( 'message', 4, $this->edit_link( $post_id ) );
		}
		
		$location = apply_filters( 'redirect_post_location', $location, $post_id );

		$this->response( $location );

	}

	public function wp_fee_shortcode() {

		global $post;

		if ( isset( $_POST['post_id'] ) ) {

			$post = $_POST['post_id'];
			$post = get_post( $post );

		}

		$r = $_POST['shortcode'];
		$r = wp_unslash( $r );
		$r = $this->do_shortcode( $r );

		$this->response( $r );

	}

	public function do_shortcode( $content ) {

		global $shortcode_tags;

		if ( empty( $shortcode_tags )
			|| ! is_array( $shortcode_tags ) )

			return $content;

		$pattern = get_shortcode_regex();

		return preg_replace_callback( "/$pattern/s", array( $this, 'do_shortcode_tag' ), $content );

	}

	public function do_shortcode_tag( $m ) {

		global $shortcode_tags;

		if ( $m[1] == '[' && $m[6] == ']' )

			return $m[0];

		$tag = $m[2];
		$attr = shortcode_parse_atts( $m[3] );

		$m[5] = isset( $m[5] ) ? $m[5] : null;

		if ( in_array( $tag, array( 'gallery', 'caption' ) ) ) {

			$r = '<div class="wp-fee-shortcode-container mceNonEditable" contenteditable="false">';
				$r .= '<div style="display: none;" class="wp-fee-shortcode">';
					$r .= $m[0];
				$r .= '</div>';
				$r .= $m[1] . call_user_func( $shortcode_tags[$tag], $attr, $m[5], $tag ) . $m[6];
				$r .= '<div class="wp-fee-shortcode-options" style="display: none;">';
					$r .= '<div class="wp-fee-shortcode-remove"><br></div>';
					$r .= '<div class="wp-fee-shortcode-edit" data-kind="' . $tag . '"><br></div>';
				$r .= '</div>';
			$r .= '</div>';

			return $r;

		}

		return $m[0];

	}

	public function wp_fee_embed() {

		// Strict standards notice when url can't be embeded.
		$embed = @wp_oembed_get( $_POST['content'] );

		if ( $embed ) {

			$r = '<div class="wp-fee-shortcode-container mceNonEditable" contenteditable="false">';
				$r .= '<div style="display: none;" class="wp-fee-shortcode">';
					$r .= $_POST['content'];
				$r .= '</div>';
				$r .= $embed;
				$r .= '<div class="wp-fee-shortcode-options" style="display: none;">';
					$r .= '<div class="wp-fee-shortcode-remove"><br></div>';
				$r .= '</div>';
			$r .= '</div>';

			$this->response( $r );

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
		
		$r = '<div class="wp-fee-shortcode-container mceNonEditable" contenteditable="false">';
			$r .= '<div style="display: none;" class="wp-fee-shortcode">';
				$r .= $m[0];
			$r .= '</div>';
			$r .= $return;
			$r .= '<div class="wp-fee-shortcode-options" style="display: none;">';
				$r .= '<div class="wp-fee-shortcode-remove"><br></div>';
			$r .= '</div>';
		$r .= '</div>';

		return $r;

	}

	public function wp_fee_new() {

		require_once( ABSPATH . '/wp-admin/includes/post.php' );

		$post = get_default_post_to_edit( isset( $_POST['post_type'] ) ? $_POST['post_type'] : 'post', true );

		$this->response( $this->edit_link( $post->ID ) );

	}

	public function admin_enqueue_scripts() {

		global $pagenow, $revision;

		if ( $pagenow === 'post.php'
			|| $pagenow === 'post-new.php'  ) {

			wp_enqueue_script( 'wp-back-end-editor', $this->url( '/js/wp-back-end-editor.js' ), array( 'jquery' ), self::VERSION, true );

		} elseif ( $pagenow === 'revision.php'
			&& isset( $_GET['redirect'] )
			&& $_GET['redirect'] === 'front' ) {

			wp_enqueue_script( 'wp-fee-revision', $this->url( '/js/revision.js' ), array( 'jquery' ), self::VERSION, true );
			
			wp_localize_script( 'wp-fee-revision', 'wpFee', array(
				'editLink' => $this->edit_link( $revision->post_parent )
			) );

		}

	}

	public function redirect_post_location( $location, $post_id ) {

		return $this->edit_link( $post_id );

	}

	public function meta_modal() {

		global $post, $post_type, $post_type_object, $current_screen, $wp_meta_modal_sections;
		
		$post_ID = $post->ID;
		
		set_current_screen( $post_type );

		if ( ! wp_check_post_lock( $post->ID ) ) {

			$active_post_lock = wp_set_post_lock( $post->ID );

		}

		$messages = array();
		$messages['post'] = array(
			 0 => '', // Unused. Messages start at index 1.
			 1 => sprintf( __('Post updated. <a href="%s">View post</a>'), esc_url( get_permalink($post_ID) ) ),
			 2 => __('Custom field updated.'),
			 3 => __('Custom field deleted.'),
			 4 => __('Post updated.'),
			/* translators: %s: date and time of the revision */
			 5 => isset($_GET['revision']) ? sprintf( __('Post restored to revision from %s'), wp_post_revision_title( (int) $_GET['revision'], false ) ) : false,
			 6 => sprintf( __('Post published. <a href="%s">View post</a>'), esc_url( get_permalink($post_ID) ) ),
			 7 => __('Post saved.'),
			 8 => __('Post submitted.'),
			 9 => sprintf( __('Post scheduled for: <strong>%1$s</strong>.'),
				// translators: Publish box date format, see http://php.net/date
				date_i18n( __( 'M j, Y @ G:i' ), strtotime( $post->post_date ) ) ),
			10 => __('Post draft updated.')
		);
		$messages['page'] = array(
			 0 => '', // Unused. Messages start at index 1.
			 1 => sprintf( __('Page updated. <a href="%s">View page</a>'), esc_url( get_permalink($post_ID) ) ),
			 2 => __('Custom field updated.'),
			 3 => __('Custom field deleted.'),
			 4 => __('Page updated.'),
			 5 => isset($_GET['revision']) ? sprintf( __('Page restored to revision from %s'), wp_post_revision_title( (int) $_GET['revision'], false ) ) : false,
			 6 => sprintf( __('Page published. <a href="%s">View page</a>'), esc_url( get_permalink($post_ID) ) ),
			 7 => __('Page saved.'),
			 8 => __('Page submitted.' ),
			 9 => sprintf( __('Page scheduled for: <strong>%1$s</strong>.'), date_i18n( __( 'M j, Y @ G:i' ), strtotime( $post->post_date ) ) ),
			10 => __('Page draft updated.')
		);
		$messages['attachment'] = array_fill( 1, 10, __( 'Media attachment updated.' ) ); // Hack, for now.

		$messages = apply_filters( 'post_updated_messages', $messages );

		$message = false;
		if ( isset($_GET['message']) ) {
			$_GET['message'] = absint( $_GET['message'] );
			if ( isset($messages[$post_type][$_GET['message']]) )
				$message = $messages[$post_type][$_GET['message']];
			elseif ( !isset($messages[$post_type]) && isset($messages['post'][$_GET['message']]) )
				$message = $messages['post'][$_GET['message']];
		}

		$notice = false;
		$form_extra = '';
		if ( 'auto-draft' == $post->post_status ) {
			$autosave = false;
			$form_extra .= "<input type='hidden' id='auto_draft' name='auto_draft' value='1' />";
		} else {
			$autosave = wp_get_post_autosave( $post_ID );
		}

		$form_action = 'editpost';
		$nonce_action = 'update-post_' . $post_ID;

		// Detect if there exists an autosave newer than the post and if that autosave is different than the post
		if ( $autosave && mysql2date( 'U', $autosave->post_modified_gmt, false ) > mysql2date( 'U', $post->post_modified_gmt, false ) ) {
			foreach ( _wp_post_revision_fields() as $autosave_field => $_autosave_field ) {
				if ( normalize_whitespace( $autosave->$autosave_field ) != normalize_whitespace( $post->$autosave_field ) ) {
					$notice = sprintf( __( 'There is an autosave of this post that is more recent than the version below. <a href="%s">View the autosave</a>' ), get_edit_post_link( $autosave->ID ) );
					break;
				}
			}
			// If this autosave isn't different from the current post, begone.
			if ( ! $notice )
				wp_delete_post_revision( $autosave->ID );
			unset($autosave_field, $_autosave_field);
		}

		$post_type_object = get_post_type_object($post_type);

		$this->add_meta_modal_section( 'submitdiv', __( 'Publish' ) , array( $this, 'meta_section_publish' ), 10, 10 );

		if ( post_type_supports( $post_type, 'revisions' )
			&& 'auto-draft' !== $post->post_status ) {

			$revisions = wp_get_post_revisions( $post->ID );

			$count = count( $revisions );

			if ( $count > 1 ) {

				$this->add_meta_modal_section( 'revisionsdiv', __( 'Revisions' ) . ' (' . $count . ')', 'post_revisions_meta_box', 30, 50 );

			}

		}

		if ( current_theme_supports( 'post-formats' )
			&& post_type_supports( $post_type, 'post-formats' ) )

			$this->add_meta_modal_section( 'formatdiv', _x( 'Format', 'post format' ), 'post_format_meta_box', 20, 10 );

		foreach ( get_object_taxonomies( $post ) as $tax_name ) {

			$taxonomy = get_taxonomy( $tax_name );

			if ( ! $taxonomy->show_ui
				|| false === $taxonomy->meta_box_cb )

				continue;

			$label = $taxonomy->labels->name;

			if ( ! is_taxonomy_hierarchical( $tax_name ) ) {

				$tax_meta_box_id = 'tagsdiv-' . $tax_name;

			} else {

				$tax_meta_box_id = $tax_name . 'div';

			}

			$this->add_meta_modal_section( $tax_meta_box_id, $label, $taxonomy->meta_box_cb, 20, 20, array( 'taxonomy' => $tax_name ) );

		}

		if ( post_type_supports( $post_type, 'page-attributes' ) )

			$this->add_meta_modal_section( 'pageparentdiv', 'page' == $post_type ? __( 'Page Attributes' ) : __( 'Attributes' ), 'page_attributes_meta_box', 10, 10 );

		if ( post_type_supports( $post_type, 'excerpt' ) )

			$this->add_meta_modal_section( 'postexcerpt', __( 'Excerpt' ), 'post_excerpt_meta_box', 30, 10 );

		if ( post_type_supports( $post_type, 'trackbacks' ) )

			$this->add_meta_modal_section( 'trackbacksdiv', __( 'Send Trackbacks' ), 'post_trackback_meta_box', 30, 20 );

		if ( post_type_supports( $post_type, 'custom-fields' ) )

			$this->add_meta_modal_section( 'postcustom', __( 'Custom Fields' ), 'post_custom_meta_box', 30, 30 );

		if ( post_type_supports( $post_type, 'comments' ) )

			$this->add_meta_modal_section( 'commentstatusdiv', __( 'Discussion' ), 'post_comment_status_meta_box', 30, 40 );

		require_once( 'meta-modal-template.php' );
		
		unset( $GLOBALS['current_screen'] );

	}

	public function add_meta_modal_section( $id, $title, $callback, $context = 20, $priority = 10, $args = null ) {

		global $wp_meta_modal_sections;

		if ( ! isset( $wp_meta_modal_sections ) )

			$wp_meta_modal_sections = array();

		if ( ! isset( $wp_meta_modal_sections[$context] ) )

			$wp_meta_modal_sections[$context] = array();

		foreach ( array_keys( $wp_meta_modal_sections ) as $a_context ) {

			foreach ( array_keys( $wp_meta_modal_sections[$a_context] ) as $a_priority ) {

				if ( ! isset( $wp_meta_modal_sections[$a_context][$a_priority][$id] ) )

					continue;

				if ( false === $wp_meta_modal_sections[$a_context][$a_priority][$id] )

					return;

				if ( $priority != $a_priority
					|| $context != $a_context )

					unset( $wp_meta_modal_sections[$a_context][$a_priority][$id] );

			}

		}

		if ( ! isset( $wp_meta_modal_sections[$context][$priority]) )

			$wp_meta_modal_sections[$context][$priority] = array();

		$wp_meta_modal_sections[$context][$priority][$id] = array(
			'id' => $id,
			'title' => $title,
			'callback' => $callback,
			'args' => $args
		);

	}

	public function meta_section_publish( $post, $args = array() ) {

			global $action;

			$post_type = $post->post_type;
			$post_type_object = get_post_type_object($post_type);
			$can_publish = current_user_can($post_type_object->cap->publish_posts);

		?>
		<div class="submitbox" id="submitpost">
			<div id="minor-publishing">
				<div id="misc-publishing-actions">
					<div class="misc-pub-section misc-pub-post-status">
						<?php _e( 'Status:' ) ?>
						<span id="post-status-display">
						<?php
							switch ( $post->post_status ) {
								case 'private':
									_e('Privately Published');
									break;
								case 'publish':
									_e('Published');
									break;
								case 'future':
									_e('Scheduled');
									break;
								case 'pending':
									_e('Pending Review');
									break;
								case 'draft':
								case 'auto-draft':
									_e('Draft');
									break;
							}
						?>
						</span>
						<?php if ( 'publish' == $post->post_status || 'private' == $post->post_status || $can_publish ) { ?>
						<a href="#post_status"<?php 'private' == $post->post_status ? ' style="display:none;"' : ''; ?> class="edit-post-status hide-if-no-js"><?php _e( 'Edit' ) ?></a>
						<div id="post-status-select" class="hide-if-js">
							<input type="hidden" name="hidden_post_status" id="hidden_post_status" value="<?php echo esc_attr( ('auto-draft' == $post->post_status ) ? 'draft' : $post->post_status); ?>" />
							<select name='post_status' id='post_status'>
								<?php if ( 'publish' == $post->post_status ) : ?>
								<option<?php selected( $post->post_status, 'publish' ); ?> value='publish'><?php _e('Published') ?></option>
								<?php elseif ( 'private' == $post->post_status ) : ?>
								<option<?php selected( $post->post_status, 'private' ); ?> value='publish'><?php _e('Privately Published') ?></option>
								<?php elseif ( 'future' == $post->post_status ) : ?>
								<option<?php selected( $post->post_status, 'future' ); ?> value='future'><?php _e('Scheduled') ?></option>
								<?php endif; ?>
								<option<?php selected( $post->post_status, 'pending' ); ?> value='pending'><?php _e('Pending Review') ?></option>
								<?php if ( 'auto-draft' == $post->post_status ) : ?>
								<option<?php selected( $post->post_status, 'auto-draft' ); ?> value='draft'><?php _e('Draft') ?></option>
								<?php else : ?>
								<option<?php selected( $post->post_status, 'draft' ); ?> value='draft'><?php _e('Draft') ?></option>
								<?php endif; ?>
							</select>
							 <a href="#post_status" class="save-post-status hide-if-no-js button"><?php _e( 'OK' ); ?></a>
							 <a href="#post_status" class="cancel-post-status hide-if-no-js"><?php _e( 'Cancel' ); ?></a>
						</div>
						<?php } ?>
					</div>
					<div class="misc-pub-section misc-pub-visibility" id="visibility">
					<?php _e('Visibility:'); ?> <span id="post-visibility-display"><?php
					if ( 'private' == $post->post_status ) {
						$post->post_password = '';
						$visibility = 'private';
						$visibility_trans = __('Private');
					} elseif ( !empty( $post->post_password ) ) {
						$visibility = 'password';
						$visibility_trans = __('Password protected');
					} elseif ( $post_type == 'post' && is_sticky( $post->ID ) ) {
						$visibility = 'public';
						$visibility_trans = __('Public, Sticky');
					} else {
						$visibility = 'public';
						$visibility_trans = __('Public');
					}

					echo esc_html( $visibility_trans ); ?></span>
					<?php if ( $can_publish ) { ?>
					<a href="#visibility" class="edit-visibility hide-if-no-js"><?php _e('Edit'); ?></a>

					<div id="post-visibility-select" class="hide-if-js">
					<input type="hidden" name="hidden_post_password" id="hidden-post-password" value="<?php echo esc_attr($post->post_password); ?>" />
					<?php if ($post_type == 'post'): ?>
					<input type="checkbox" style="display:none" name="hidden_post_sticky" id="hidden-post-sticky" value="sticky" <?php checked(is_sticky($post->ID)); ?> />
					<?php endif; ?>
					<input type="hidden" name="hidden_post_visibility" id="hidden-post-visibility" value="<?php echo esc_attr( $visibility ); ?>" />
					<input type="radio" name="visibility" id="visibility-radio-public" value="public" <?php checked( $visibility, 'public' ); ?> /> <label for="visibility-radio-public" class="selectit"><?php _e('Public'); ?></label><br />
					<?php if ( $post_type == 'post' && current_user_can( 'edit_others_posts' ) ) : ?>
					<span id="sticky-span"><input id="sticky" name="sticky" type="checkbox" value="sticky" <?php checked( is_sticky( $post->ID ) ); ?> /> <label for="sticky" class="selectit"><?php _e( 'Stick this post to the front page' ); ?></label><br /></span>
					<?php endif; ?>
					<input type="radio" name="visibility" id="visibility-radio-password" value="password" <?php checked( $visibility, 'password' ); ?> /> <label for="visibility-radio-password" class="selectit"><?php _e('Password protected'); ?></label><br />
					<span id="password-span"><label for="post_password"><?php _e('Password:'); ?></label> <input type="text" name="post_password" id="post_password" value="<?php echo esc_attr($post->post_password); ?>"  maxlength="20" /><br /></span>
					<input type="radio" name="visibility" id="visibility-radio-private" value="private" <?php checked( $visibility, 'private' ); ?> /> <label for="visibility-radio-private" class="selectit"><?php _e('Private'); ?></label><br />

					<p>
					 <a href="#visibility" class="save-post-visibility hide-if-no-js button"><?php _e('OK'); ?></a>
					 <a href="#visibility" class="cancel-post-visibility hide-if-no-js"><?php _e('Cancel'); ?></a>
					</p>
					</div>
					<?php } ?>
					</div><!-- .misc-pub-section -->
					<?php
					$datef = __( 'M j, Y @ G:i' );
					if ( 0 != $post->ID ) {
						if ( 'future' == $post->post_status ) { // scheduled for publishing at a future date
							$stamp = __('Scheduled for: <b>%1$s</b>');
						} else if ( 'publish' == $post->post_status || 'private' == $post->post_status ) { // already published
							$stamp = __('Published on: <b>%1$s</b>');
						} else if ( '0000-00-00 00:00:00' == $post->post_date_gmt ) { // draft, 1 or more saves, no date specified
							$stamp = __('Publish <b>immediately</b>');
						} else if ( time() < strtotime( $post->post_date_gmt . ' +0000' ) ) { // draft, 1 or more saves, future date specified
							$stamp = __('Schedule for: <b>%1$s</b>');
						} else { // draft, 1 or more saves, date specified
							$stamp = __('Publish on: <b>%1$s</b>');
						}
						$date = date_i18n( $datef, strtotime( $post->post_date ) );
					} else { // draft (no saves, and thus no date specified)
						$stamp = __('Publish <b>immediately</b>');
						$date = date_i18n( $datef, strtotime( current_time('mysql') ) );
					}

					if ( $can_publish ) : // Contributors don't get to choose the date of publish ?>
					<div class="misc-pub-section curtime misc-pub-curtime">
						<span id="timestamp">
						<?php printf($stamp, $date); ?></span>
						<a href="#edit_timestamp" class="edit-timestamp hide-if-no-js"><?php _e('Edit') ?></a>
						<div id="timestampdiv" class="hide-if-js"><?php touch_time(($action == 'edit'), 1); ?></div>
					</div>
					<?php endif; ?>
					<?php do_action('post_submitbox_misc_actions'); ?>
				</div>
				<div class="clear"></div>
			</div>
		</div>
		<?php

		if ( ! ( 'pending' == get_post_status( $post )
				&& ! current_user_can( $post_type_object->cap->publish_posts ) ) ) {

		?>
		<p>
			<label for="post_name"><?php _e('Slug') ?></label>
			<input name="post_name" type="text" size="13" id="post_name" value="<?php echo esc_attr( apply_filters( 'editable_slug', $post->post_name ) ); ?>">
		</p>
		<?php

		}

		if ( post_type_supports( $post_type, 'author' )
			&& ( is_super_admin()
				|| current_user_can( $post_type_object->cap->edit_others_posts ) ) ) {

		?>
		<p>
			<label for="post_author_override"><?php _e( 'Author' ); ?></label>
			<?php

			wp_dropdown_users( array(
				'who' => 'authors',
				'name' => 'post_author_override',
				'selected' => empty( $post->ID ) ? $user_ID : $post->post_author,
				'include_selected' => true
			) );

			?>
		</p>
		<?php

		}
		
		if ( post_type_supports( $post_type, 'title' ) ) {

		?>
		<p>
			<label for="post_title"><?php _e( 'Title' ); ?></label>
			<input name="post_title" type="text" id="post_title" value="<?php echo esc_attr( $post->post_title ); ?>">
		</p>
		<?php

		}

	}

	public function really_did_action( $tag ) {

		$count = did_action( $tag );

		return $this->doing_action( $tag ) ? $count - 1 : $count;

	}

	public function doing_action( $tag ) {

		global $wp_current_filter;

		return in_array( $tag, $wp_current_filter );

	}

	public function link_modal() {

		$search_panel_visible = '1' == get_user_setting( 'wplink', '0' ) ? ' class="search-panel-visible wp-core-ui"' : ' class="wp-core-ui"';

		?>
		<div id="wp-link-backdrop"></div>
		<div id="wp-link-wrap"<?php echo $search_panel_visible; ?>>
		<form id="wp-link" tabindex="-1">
		<?php wp_nonce_field( 'internal-linking', '_ajax_linking_nonce', false ); ?>
		<div id="link-modal-title">
			<?php _e( 'Insert/edit link' ) ?>
			<div id="wp-link-close" tabindex="0"></div>
		</div>
		<div id="link-selector">
			<div id="link-options">
				<p class="howto"><?php _e( 'Enter the destination URL' ); ?></p>
				<div>
					<label><span><?php _e( 'URL' ); ?></span><input id="url-field" type="text" name="href" /></label>
				</div>
				<div>
					<label><span><?php _e( 'Title' ); ?></span><input id="link-title-field" type="text" name="linktitle" /></label>
				</div>
				<div class="link-target">
					<label><span>&nbsp;</span><input type="checkbox" id="link-target-checkbox" /> <?php _e( 'Open link in a new window/tab' ); ?></label>
				</div>
			</div>
			<p class="howto" id="wp-link-search-toggle"><?php _e( 'Or link to existing content' ); ?></p>
			<div id="search-panel">
				<div class="link-search-wrapper">
					<label>
						<span class="search-label"><?php _e( 'Search' ); ?></span>
						<input type="search" id="search-field" class="link-search-field" autocomplete="off" />
						<span class="spinner"></span>
					</label>
				</div>
				<div id="search-results" class="query-results">
					<ul></ul>
					<div class="river-waiting">
						<span class="spinner"></span>
					</div>
				</div>
				<div id="most-recent-results" class="query-results">
					<div class="query-notice"><em><?php _e( 'No search term specified. Showing recent items.' ); ?></em></div>
					<ul></ul>
					<div class="river-waiting">
						<span class="spinner"></span>
					</div>
				</div>
			</div>
		</div>
		<div class="submitbox">
			<div id="wp-link-update">
				<input type="submit" value="<?php esc_attr_e( 'Add Link' ); ?>" class="button button-primary" id="wp-link-submit" name="wp-link-submit">
			</div>
			<div id="wp-link-cancel">
				<a class="submitdelete deletion" href="#"><?php _e( 'Cancel' ); ?></a>
			</div>
		</div>
		</form>
		</div>
		<?php

	}

	public function _admin_bar_bump_cb() {
		?>
		<style type="text/css" media="screen">
			html { margin-top: 37px !important; }
			* html body { margin-top: 37px !important; }
			@media screen and ( max-width: 782px ) {
				html { margin-top: 46px !important; }
				* html body { margin-top: 46px !important; }
			}
		</style>
		<?php
	}

}
