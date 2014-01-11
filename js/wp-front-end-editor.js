( function( $, globals ) {
	'use strict';
	var postTitle,
		postContent,
		postCategory,
		tagsInput,
		title = '#wp-fee-title-' + wpFee.postId,
		content = '#wp-fee-content-' + wpFee.postId,
		mceToolbar = '#wp-admin-bar-wp-fee-mce-toolbar',
		docTitle = ( $( title ).text().length ? document.title.replace( $( title ).text(), '<!--replace-->' ) : document.title ),
		menupopHeight = ( $(window).height() ) - 42;
	globals.wpActiveEditor = null;
	globals.send_to_editor = function( content ) {
		if ( content.slice( 0, 8 ) === '[gallery' || content.slice( 0, 8 ) === '[caption' ) {
			$.ajax( {
				type: 'POST',
				url: wpFee.ajaxUrl,
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
		} else {
			tinyMCE
				.activeEditor
				.insertContent( content );
		}
	};
	globals.WPRemoveThumbnail = function( nonce ) {
		$.post( wpFee.ajaxUrl, {
			action: 'set-post-thumbnail',
			post_id: wpFee.postId,
			thumbnail_id: -1,
			_ajax_nonce: nonce,
			cookie: encodeURIComponent( document.cookie )
		}, function( html ){
			if ( html == '0' ) {
				alert( setPostThumbnailL10n.error );
			} else {
				$( '.inside', '#postimagediv' ).html( html );
				$( '.fee-edit-thumbnail' ).addClass( 'empty' );
			}
		} );
	};
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
			if ( $( '.fee-edit-thumbnail:has(img)' ).length === 0 ) {
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
		.on( 'keydown', function( event ) {
			if ( event.keyCode === 83 && ( navigator.platform.match( 'Mac' ) ? event.metaKey : event.ctrlKey ) ) {
				event.preventDefault();
				event.stopPropagation();
				$( '#wp-fee-save' )
					.trigger( 'click' );
			}
			if ( event.keyCode === 27 ) {
				event.preventDefault();
				event.stopPropagation();
				window.location.href = $( '#wp-admin-bar-wp-fee-close a' ).attr( 'href' );
			}
		} )
		.ready( function() {
			$( title )
				.attr( 'contenteditable', 'true' )
				.on( 'keyup', function() {
					document.title = docTitle.replace( '<!--replace-->', $( this ).text() );
				} )
				.keypress( function( event ) {
					return event.which !== 13;
				} )
				.on( 'blur', function() {
					var titleOnBlur;
					$( this ).find( '*' ).each( function() {
					    titleOnBlur = $( this ).contents();
					    $(this).replaceWith( titleOnBlur );
					});
				} );
			$( content )
				.attr( 'contenteditable', 'true' );
			tinyMCE
				.init( {
					selector: content,
					inline: true,
					plugins: 'link charmap paste textcolor',
					toolbar1: 'kitchensink bold italic underline strikethrough blockquote alignleft aligncenter alignright bullist numlist media undo redo',
					toolbar2: 'kitchensink removeformat alignjustify outdent indent', // formatselect forecolor backcolor table
					menubar: false,
					fixed_toolbar_container: mceToolbar,
					skin: false,
					object_resizing: false,
					relative_urls: false,
					convert_urls: false,
					valid_elements: '*[*]',
					valid_children : '+div[style],+div[script]',
					setup: function( editor ) {
						// Temporary, until we have a hook.
						setTimeout( function() {
							editor.focus();
						}, 1000 );
						editor.addButton( 'kitchensink', {
							title: 'More...',
							onclick: function( event ) {
								var toolbar = $( event.srcElement ).parents( '.mce-toolbar' );
								toolbar.hide();
								if ( toolbar.next().length > 0 ) {
									toolbar
										.next()
										.show();
								} else {
									toolbar
										.parent()
										.children()
										.first()
										.show();
								}
							}
						} );
						editor.addButton( 'media', {
							title: 'Add Media'
						} );
						editor
							.on( 'focus', function() {
								$( 'p.wp-fee-content-placeholder' ).hide();
							} )
							.on( 'blur', function() {
								var contentOnBlur = editor.getContent();
								contentOnBlur = contentOnBlur.replace( /\s/g, '' );
								contentOnBlur = contentOnBlur.replace( /&nbsp;/g, '' );
								contentOnBlur = contentOnBlur.replace( /<br>/g, '' );
								contentOnBlur = contentOnBlur.replace( /<p><\/p>/g, '' );
								if ( ! contentOnBlur ) {
									$( 'p.wp-fee-content-placeholder' ).show();
								}
							} );
						$( window )
							.on( 'resize', function() {
								$( mceToolbar )
									.find('*:not(.mce-toolbar)')
									.removeAttr( 'style' );
							} )
							.on( 'DOMNodeInserted', function() {
								$( mceToolbar )
									.find('*:not(.mce-toolbar)')
									.removeAttr( 'style' );
								$( '.mce-i-media' )
									.data( 'editor', 'fee-edit-content-' + wpFee.postId )
									.addClass( 'insert-media add_media' );
							} );
					},
					paste_preprocess: function( plugin, args ) {
						if ( args.content.match( /^\s*(https?:\/\/[^\s"]+)\s*$/im ) ) {
							$.ajax( {
								type: 'POST',
								url: wpFee.ajaxUrl,
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
						.not( this ).not( $(this).parents( '.menupop' ) ).not( $(this).find( '.menupop' ) )
						.removeClass( 'hover' );
				} );
			$('.ab-sub-wrapper')
				.css( {
					'max-height' : menupopHeight + 'px',
					'overflow' : 'scroll'
				} );
			$( '#input-tags' )
				.keypress( function( event ) {
					if ( event.which === 13 ) {
						var tag = $( this ).val();
						$( this ).val('');
						var htmlTag = '<li class="wp-fee-tags"><div class="ab-item ab-empty-item"><span class="ab-icon wp-fee-remove-tag"></span> <span class="wp-fee-tag">' + tag + '</span></div></li>';
						if ( tag ) {
							$( '#wp-admin-bar-wp-fee-tags-default' )
								.append( htmlTag );
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
			$( '.wp-fee-submit' )
				.on( 'click', function( event ) {
					var sumbitButton = $( this );
					if ( sumbitButton.hasClass( 'button-primary-disabled' ) || sumbitButton.hasClass( 'button-disabled' ) )
						return;
					sumbitButton
						.addClass( sumbitButton.hasClass( 'button-primary' ) ? 'button-primary-disabled' : 'button-disabled' )
						.text( sumbitButton.data( 'working' ) );
					$( '#wp-admin-bar-wp-fee-close' ).animate( { width: 'toggle' }, 300 );
					postTitle = $( title ).text();
					postContent = tinyMCE.activeEditor.getContent();
					postContent = $( '<div>' + postContent + '</div>' );
					postContent
						.find( '.wp-fee-shortcode' )
						.each( function() {
							$( this )
								.parents( '.wp-fee-shortcode-container' )
								.replaceWith( $( this ).html() );
						} );
					postContent = $( postContent ).html();
					postCategory = $( 'input[name="post_category[]"]:checked' )
						.map( function() {
							return this.value;
						} )
						.get();
					tagsInput = '';
					$( '.wp-fee-tag' )
						.each( function() {
							tagsInput += $( this ).text() + ', ';
						} );
					tagsInput = tagsInput.slice( 0, -2 );
					$.ajax({
						type: 'POST',
						url: wpFee.ajaxUrl,
						data: {
							'action': 'wp_fee_post',
							'post_ID': wpFee.postId,
							'post_title': postTitle,
							'post_content': postContent,
							'post_category': postCategory,
							'tags_input': tagsInput,
							'publish' : ( sumbitButton.attr( 'id' ) === 'wp-fee-publish' ) ? 'Publish' : null,
							'_wpnonce': wpFee.updatePostNonce
						},
						success: function( data ) {
							sumbitButton
								.text( sumbitButton.data( 'done' ) );
							if ( wpFee.redirectPostLocation ) {
								window.location.href = wpFee.redirectPostLocation;
							} else {
								setTimeout( function() {
									sumbitButton
										.removeClass( sumbitButton.hasClass( 'button-primary' ) ? 'button-primary-disabled' : 'button-disabled' )
										.text( sumbitButton.data( 'default' ) );
									$( '#wp-admin-bar-wp-fee-close' ).animate( { width: 'toggle' }, 300 );
								}, 600 );
							}
						},
						error: function() {
							alert( 'An error occurred.' );
						}
					} );
				} );
		} );
} ( jQuery, this ) );
