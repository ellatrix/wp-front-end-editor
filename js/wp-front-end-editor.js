( function( $, globals ) {
	'use strict';
	var postTitle,
		postContent,
		title = '#wp-fee-title-' + wpFee.postId,
		content = '#wp-fee-content-' + wpFee.postId,
		mceToolbar = '#wp-admin-bar-wp-fee-mce-toolbar',
		docTitle = ( $( title ).text().length ? document.title.replace( $( title ).text(), '<!--replace-->' ) : document.title ),
		menupopHeight = ( $(window).height() ) - 42,
		convertReplace,
		frame;
	globals.wpActiveEditor = null;
	globals.send_to_editor = function( content ) {
		if ( content.slice( 0, 8 ) === '[gallery'
			|| content.slice( 0, 8 ) === '[caption' ) {
			var data = {
				'action': 'wp_fee_shortcode',
				'shortcode': content
			};
			$.post( wpFee.ajaxUrl, data, function( data ) {
				tinyMCE
					.activeEditor
					.insertContent( data );
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
	$.fn.serializeObject = function() {
		var o = {};
		var a = this.serializeArray();
		$.each( a, function() {
			if ( o[this.name] !== undefined ) {
				if ( ! o[this.name].push ) {
					o[this.name] = [o[this.name]];
				}
				o[this.name].push( this.value || '' );
			} else {
				o[this.name] = this.value || '';
			}
		} );
		return o;
	};
	convertReplace = function( n, o ) {
		var dom = tinyMCE
			.activeEditor
			.dom;
		var post = {
			'action': 'wp_fee_shortcode',
			'shortcode': n
		};
		$.post( wpFee.ajaxUrl, post, function( n ) {
			// Does weird things when editing a caption for the second time.
			n = dom
				.createFragment( n );
			dom
				.replace( n, o );
		} );
	};
	$( document )
		.on( 'click', 'a:not(#wpadminbar a, .wp-core-ui a, .post-edit-link)', function( event ) {
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
		.on( 'click', '.wp-fee-shortcode-edit', function() {
			var container = $( this )
				.parents( '.wp-fee-shortcode-container' );
			switch ( $( this ).data( 'kind' ) ) {
				case 'gallery':
					var shortcode = container
						.children( '.wp-fee-shortcode' )
						.html();
					var gallery = wp
						.media
						.gallery;
					gallery
						.edit( shortcode )
						.state('gallery-edit')
							.on( 'update', function( selection ) {
								shortcode = gallery
									.shortcode( selection )
									.string();
								convertReplace( shortcode, container );
						} );
					break;
				case 'caption':
					var img = container
						.find( 'img' )
						.attr( 'class' );
					var id = img
						.match( /wp-image-([\d]*)/i )[1];
					if ( frame ) {
						frame.open();
					} else {
						frame = wp
							.media( {
								title : 'Edit Media',
								button : {
									text : 'Edit Media'
								}
							} );
						frame
							.on( 'open', function() {
								var selection = frame
									.state()
									.get( 'selection' );
								var attachment = wp
									.media
									.attachment( id );
								attachment
									.fetch();
								selection
									.add( attachment ? [ attachment ] : [] );
							} )
							.on( 'select', function() {
								var selection = frame
									.state()
									.get( 'selection' ).first();
								if ( ! selection )
									return;
								var display = frame
									.state()
									.display( selection )
									.toJSON();
								wp
									.media
									.editor
									.send
									.attachment( display, selection.toJSON() )
									.done( function() {
										convertReplace( arguments[0], container );
									} );
							} )
							.open();
					}
					break;
			}
		} )
		.on( 'keydown', function( event ) {
			if ( event.keyCode === 83 && ( navigator.platform.match( 'Mac' ) ? event.metaKey : event.ctrlKey ) ) {
				event
					.preventDefault();
				event
					.stopPropagation();
				$( '#wp-fee-save' )
					.trigger( 'click' );
			}
			if ( event.keyCode === 27 ) {
				event
					.preventDefault();
				event
					.stopPropagation();
				window.location.href = $( '#wp-admin-bar-wp-fee-close a' ).attr( 'href' );
			}
		} )
		.ready( function() {
			$( title )
				.attr( 'contenteditable', 'true' )
				.on( 'keyup', function() {
					document.title = docTitle
						.replace( '<!--replace-->', $( this ).text() );
				} )
				.on( 'keypress', function( event ) {
					return event.which !== 13;
				} )
				.on( 'blur', function() {
					var titleOnBlur;
					$( this )
						.find( '*' )
						.each( function() {
							titleOnBlur = $( this )
								.contents();
							$(this)
								.replaceWith( titleOnBlur );
						} );
				} );
			$( content )
				.attr( 'contenteditable', 'true' );
			tinyMCE
				.init( {
					selector: content,
					inline: true,
					plugins: 'wpfeelink charmap paste textcolor table',
					toolbar1: 'kitchensink formatselect bold italic underline strikethrough blockquote alignleft aligncenter alignright alignjustify link media undo redo',
					toolbar2: 'kitchensink removeformat bullist numlist outdent indent forecolor backcolor table',
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
							editor
								.focus();
						}, 1500 );
						editor.addButton( 'kitchensink', {
							title: 'More...',
							onclick: function( event ) {
								var toolbar = $( event.srcElement )
									.parents( '.mce-toolbar' );
								toolbar
									.hide();
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
								$( 'p.wp-fee-content-placeholder' )
									.hide();
							} )
							.on( 'blur', function() {
								var contentOnBlur = editor
									.getContent()
									.replace( /\s/g, '' )
									.replace( /&nbsp;/g, '' )
									.replace( /<br>/g, '' )
									.replace( /<p><\/p>/g, '' );
								if ( ! contentOnBlur ) {
									$( 'p.wp-fee-content-placeholder' ).show();
								}
							} );
						$( window )
							.on( 'resize', function() {
								$( mceToolbar )
									.find( '*' )
									.not( '.mce-toolbar' )
									.not( '.mce-preview' )
									.removeAttr( 'style' );
							} )
							.on( 'DOMNodeInserted', function() {
								$( mceToolbar )
									.find( '*' )
									.not( '.mce-toolbar' )
									.not( '.mce-preview' )
									.removeAttr( 'style' );
								$( '.mce-i-media' )
									.data( 'editor', 'fee-edit-content-' + wpFee.postId )
									.addClass( 'insert-media add_media' );
							} );
					},
					paste_preprocess: function( plugin, args ) {
						if ( args.content.match( /^\s*(https?:\/\/[^\s"]+)\s*$/im ) ) {
							var data = {
								'action': 'wp_fee_embed',
								'content': args.content
							};
							args.content = '<span id="wp-fee-working"> Working... </span>';
							$.post( wpFee.ajaxUrl, data, function( data ) {
								if ( data.match( /<script/i ) ) {
									$( data )
										.find( 'script' )
										.each( function( i, val ) {
											$.getScript( $( val ).attr( 'src' ) );
										} );
								}
								tinyMCE
									.activeEditor
									.insertContent( data );
								$( '#wp-fee-working' )
									.remove();
							} );
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
			$( '#wp-fee-meta-modal .media-menu a' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( this )
						.siblings()
						.removeClass( 'active' );
					$( this )
						.addClass( 'active' );
					$( '.wp-fee-box' )
						.hide();
					$( '#wp-fee-box-' + $( this ).data( 'box' ) )
						.show();
				} );
			$( '#wp-admin-bar-wp-fee-meta a' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( '#wp-fee-meta-modal' )
						.show();
				} );
			$( '#wp-admin-bar-wp-fee-cats a, a[rel~="category"]' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( '#wp-fee-meta-modal' )
						.show();
					$( '#media-menu-categorydiv' )
						.trigger( 'click' );
				} );
			$( '#wp-admin-bar-wp-fee-tags a, a[rel="tag"]' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( '#wp-fee-meta-modal' )
						.show();
					$( '#media-menu-tagsdiv-post_tag' )
						.trigger( 'click' );
				} );
			$( '#wp-fee-meta-modal .media-modal-close, #wp-fee-met-continue' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( '#wp-fee-meta-modal' )
						.hide();
				} );
			$( '.wp-fee-submit' )
				.on( 'click', function( event ) {
					var sumbitButton = $( this );
					if ( sumbitButton.hasClass( 'button-primary-disabled' )
						|| sumbitButton.hasClass( 'button-disabled' ) )
						return;
					sumbitButton
						.addClass( sumbitButton.hasClass( 'button-primary' ) ? 'button-primary-disabled' : 'button-disabled' )
						.text( sumbitButton.data( 'working' ) );
//					$( '#wp-admin-bar-wp-fee-close, #wp-admin-bar-wp-fee-backend' )
//						.animate( { width: 'toggle' }, 300 );

					postTitle = $( title )
						.text();

					postContent = tinyMCE
						.activeEditor
						.getContent();
					postContent = $( '<div>' + postContent + '</div>' );
					postContent
						.find( '.wp-fee-shortcode' )
						.each( function() {
							$( this )
								.parents( '.wp-fee-shortcode-container' )
								.replaceWith( $( this ).html() );
						} );
					postContent = $( postContent )
						.html();

					var postData = {
						'action': 'wp_fee_post',
						'post_ID': wpFee.postId,
						'post_title': postTitle,
						'post_content': postContent,
						'publish' : ( sumbitButton.attr( 'id' ) === 'wp-fee-publish' ) ? 'Publish' : null,
						'_wpnonce': wpFee.updatePostNonce
					};

					var metaData = $( 'form' ).serializeObject();

					$.extend( postData, metaData );

					$.post( wpFee.ajaxUrl, postData, function() {
						sumbitButton
							.text( sumbitButton.data( 'done' ) );
						if ( wpFee.redirectPostLocation ) {
							window.location.href = wpFee.redirectPostLocation;
						} else {
							setTimeout( function() {
								sumbitButton
									.removeClass( sumbitButton.hasClass( 'button-primary' ) ? 'button-primary-disabled' : 'button-disabled' )
									.text( sumbitButton.data( 'default' ) );
//								$( '#wp-admin-bar-wp-fee-close, #wp-admin-bar-wp-fee-backend' )
//									.animate( { width: 'toggle' }, 300 );
							}, 600 );
						}
					} )
					.fail( function() {
						alert( 'An error occurred.' );
					} );
				} );
		} );
} ( jQuery, this ) );
