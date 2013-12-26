( function( globals ) {
	'use strict';
	globals.send_to_editor = function( content ) {
		if ( content.slice( 0, 8 ) === '[gallery' || content.slice( 0, 8 ) === '[caption' ) {
			( function( $ ) {
				$.ajax( {
					type: 'POST',
					url: wp_fee.ajax_url,
					data: {
						'action': 'wp_fee_shortcode',
						'shortcode': content
					},
					success: function( data ) {
						tinyMCE
							.activeEditor
							.insertContent( data );
					}
				} );
			} ( jQuery ) );
		} else {
			tinyMCE
				.activeEditor
				.insertContent( content );
		}
	};
} ( this ) );
( function( $ ) {
	'use strict';
	$( document )
		.on( 'click', 'a:not(#wp-admin-bar-wp-fee-close a, .wp-fee-cancel, .post-edit-link)', function( event ) {
			event
				.preventDefault();
		} )
		.on( 'mouseenter', '.wp-fee-shortcode-container', function() {
			$( this )
				.find( '.wp-fee-shortcode-options' )
				.fadeIn();
		} )
		.on( 'mouseleave', '.wp-fee-shortcode-container', function() {
			$( this )
				.find( '.wp-fee-shortcode-options' )
				.fadeOut();
		} )
		.on( 'mouseenter', '.fee-edit-thumbnail', function() {
			$( this )
				.find( '#remove-post-thumbnail' )
				.fadeIn();
		} )
		.on( 'mouseleave', '.fee-edit-thumbnail', function() {
			$( this )
				.find( '#remove-post-thumbnail' )
				.fadeOut();
		} )
		.on( 'click', '#wp-fee-set-post-thumbnail', function() {
			$( '.fee-edit-thumbnail' )
				.removeClass( 'empty' );
			$( '#set-post-thumbnail' )
				.click();
		} )
		.on( 'click', '.media-modal-close', function() {
			if ( $( '.fee-edit-thumbnail:has(img)' ).length == 0 ) {
				$( '.fee-edit-thumbnail' ).addClass( 'empty' );
			}
		} )
		.on( 'click', '.wp-fee-shortcode-container', function() {
			$( this )
				.find( '.wp-fee-shortcode-options' )
				.fadeOut();
		} )
		.on( 'click', '.wp-fee-shortcode-remove', function() {
			$( this )
				.parents( '.wp-fee-shortcode-container' )
				.replaceWith( '<p></p>' );
		} )
//		.on( 'mouseenter', '.wp-fee-content img', function() {
//			$( this )
//				.find( '.wp-fee-shortcode-options' )
//				.fadeIn();
//		} )
//		.on( 'mouseleave', '.wp-fee-shortcode-container', function() {
//			$( this )
//				.find( '.wp-fee-shortcode-options' )
//				.fadeOut();
//		} )
		.ready( function() {
			var post_content, post_category, tags_input, _wpnonce,
				title = '#fee-edit-title-' + wp_fee.post_id,
				content = '#fee-edit-content-' + wp_fee.post_id,
				mce_toolbar = '#fee-mce-toolbar',
				saving = '#fee-saving',
				success = '#fee-success',
				post_title = $( title ).text(),
				doc_title = document.title.replace( post_title, '<!--replace-->' ),
				menupop_height = ( $(window).height() ) - 42;
			
			$( title )
				.attr( 'contenteditable', 'true' )
				.on( 'keyup', function() {
					document.title = doc_title.replace( '<!--replace-->', $( this ).text() );
				} );
	
			$( content )
				.attr( 'contenteditable', 'true' );
	
			tinymce
				.init( {
					selector: content,
					inline: true,
					plugins: 'autolink lists link charmap anchor table paste textcolor noneditable',
					toolbar1: 'bold italic underline strikethrough blockquote alignleft aligncenter alignright bullist numlist kitchensink',
					toolbar2: 'undo redo removeformat formatselect subscript superscript alignjustify outdent indent forecolor backcolor table',
					menubar: false,
					fixed_toolbar_container: mce_toolbar,
					skin: 'wordpress',
					object_resizing: false,
					relative_urls: false,
					convert_urls: false,
					valid_elements: '*[*]',
					valid_children : '+div[style],+div[script]',
					setup: function( editor ) {
						editor
							.on( 'focus', function() {
								$( '.fee-element.fee-active' )
									.removeClass( 'fee-active' );
								$( mce_toolbar )
									.addClass( 'fee-active' )
									.show();
							} )
							.on( 'blur', function() {
								$( mce_toolbar )
									.removeClass( 'fee-active' )
									.hide();
							} )
//							.on( 'PreInit', function() {
//								$( content ).find( 'script' ).each( function( i, val ) {
//									$.getScript( $( val ).attr( 'src' ) );
//								} );
//							} )
							.addButton( 'kitchensink', {
								title: 'more...',
								onclick: function() {
									$( '.mce-tinymce, .mce-abs-layout, .mce-abs-layout-item, .mce-stack-layout' )
										.removeAttr( 'style' );
									$( '.mce-toolbar:not(:first-child)' )
										.toggle();
								}
							} );
						$( '#fee-mce-toolbar' )
							.on( 'DOMNodeInserted', function() {
								if ( ! $( '.mce-tinymce' ).hasClass( 'fee-style-removed' ) ) {
									$( '.mce-tinymce, .mce-abs-layout, .mce-abs-layout-item, .mce-stack-layout' )	
										.removeAttr( 'style' );
									$( '.mce-toolbar:not(:first-child)' )
										.hide();
								}
							} );
						
						$( window )
							.on( 'resize', function() {
								$( '.mce-tinymce, .mce-tinymce .mce-abs-layout, .mce-tinymce .mce-abs-layout-item, .mce-tinymce .mce-stack-layout' )
									.removeAttr( 'style' );
							} );
					},
					paste_preprocess: function( plugin, args ) {
						if ( args.content.match( /^\s*(https?:\/\/[^\s"]+)\s*$/im ) ) {
							$.ajax( {
								type: 'POST',
								url: wp_fee.ajax_url,
								data: {
									'action': 'wp_fee_embed',
									'content': args.content
								},
								success: function(data) {
									$( data )
										.find( 'script' )
										.each( function( i, val ) {
											$.getScript( $( val ).attr( 'src' ) );
										} );
									tinyMCE
										.activeEditor
										.insertContent( data );
								}
							} );
							args.content = '';
						}
					}
				} );
					
			$( mce_toolbar )
				.draggable( {
					containment: 'document',
					start: function() {
						$( '.mce-floatpanel' )
							.hide();
					}
				} );
			
			$( '.insert-media.add_media a' )
				.data( 'editor', 'fee-edit-content-' + wp_fee.post_id )
				.addClass( 'insert-media add_media' );
			
			$( '.fee-edit-thumbnail' )
				.on( 'mouseenter', function() {
					$( this )
						.find( '.fee-edit-thumbnail-button' )
						.fadeIn( 'slow' );
				} )
				.on( 'mouseleave', function() {
					$( this )
						.find( '.fee-edit-thumbnail-button' )
						.fadeOut( 'slow' );  
				} );
			
			$( 'a[rel~="category"]' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( '.hover' )
						.not( '#wp-admin-bar-wp-fee-cats' )
						.removeClass( 'hover' );
					$( '#wp-admin-bar-wp-fee-cats' )
						.toggleClass( 'hover' );
				} );
			
			$( 'a[rel="tag"]' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( '.hover' )
						.not( '#wp-admin-bar-wp-fee-tags' )
						.removeClass( 'hover' );
					$( '#wp-admin-bar-wp-fee-tags' )
						.toggleClass( 'hover' );
				} );
			
			$( '.menupop' )
				.on( 'mouseenter', function() {
					$( '.hover' )
						.not( this )
						.removeClass( 'hover' );
				} );
					
			$('.ab-sub-wrapper')
				.css( {
					'max-height' : menupop_height + 'px',
					'overflow' : 'scroll'
				} );
			
			$( '#input-tags' )
				.keypress( function( event ) {
					if ( eevent.which === 13 ) {
						var tag = $( this ).val();
						$( this ).val('');
						var newtag = '<li class="wp-fee-tags"><div class="ab-item ab-empty-item"><span class="ab-icon wp-fee-remove-tag"></span> <span class="wp-fee-tag">' + tag + '</span></div></li>';
						if ( tag !== '' ) {
							$( '#wp-admin-bar-wp-fee-tags-default' )
								.append( newtag );
						}
						$( '.wp-fee-remove-tag' ).on( 'click', function( event ) {
							event
								.preventDefault();
							$( this )
								.parent()
								.remove();
						} );
						
					}
					
				} );
			
			$( '.wp-fee-remove-tag' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( this )
						.parent()
						.remove();
				} );
			
			$( '#fee-continue' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( success )
						.fadeOut( 'slow' );
				} );
					
			$( '#fee-save' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( saving )
						.show();
					post_title = $( title ).text();
					post_content = tinyMCE.activeEditor.getContent();
					post_content = $( '<div>' + post_content + '</div>' );
					post_content
						.find( '.wp-fee-shortcode' )
						.each( function() {
							$( this )
								.parents( '.wp-fee-shortcode-container' )
								.replaceWith( $( this ).html() );
						} );
					post_content = $( post_content ).html();
					post_category = $( 'input[name="post_category[]"]:checked' )
						.map( function() {
							return this.value;
						} )
						.get();
					tags_input = '';
					$( '.wp-fee-tag' )
						.each( function() {
							tags_input += $( this ).text() + ', ';
						} );
					tags_input = tags_input.slice( 0, -2 );
					_wpnonce = $( '#_wpnonce' ).val();
					$.ajax({
						type: 'POST',
						url: wp_fee.ajax_url,
						data: {
							'action': 'wp_fee_post',
							'ID': wp_fee.post_id,
							'post_title': post_title,
							'post_content': post_content,
							'post_category': post_category,
							'tags_input': tags_input,
							'_wpnonce': _wpnonce
						},
						success: function( data ) {
							$( success )
								.show();
							$( saving )
								.hide();
						}
					} );
				} );
		} );
	
} ( jQuery ) );
WPRemoveThumbnail = function( nonce ) {
	jQuery.post( wp_fee.ajax_url, {
		action: 'set-post-thumbnail',
		post_id: wp_fee.post_id,
		thumbnail_id: -1,
		_ajax_nonce: nonce,
		cookie: encodeURIComponent( document.cookie )
	}, function( html ){
		if ( html == '0' ) {
			alert( setPostThumbnailL10n.error );
		} else {
			jQuery( '.inside', '#postimagediv' ).html( html );
			jQuery( '.fee-edit-thumbnail' ).addClass( 'empty' );
		}
	} );
};
