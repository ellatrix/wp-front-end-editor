( function( $, globals ) {
	'use strict';
	var convertReplace, frame;
	globals.wpActiveEditor = null;
	globals.send_to_editor = function( content ) {
		if ( content.slice( 0, 8 ) === '[gallery' || content.slice( 0, 8 ) === '[caption' ) {
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
				.fadeIn( 'fast' );
		} )
		.on( 'mouseleave', '.wp-fee-shortcode-container', function() {
			$( this )
				.find( '.wp-fee-shortcode-options' )
				.fadeOut( 'fast' );
		} )
		.on( 'mouseenter', '.fee-edit-thumbnail', function() {
			$( this )
				.find( '#remove-post-thumbnail' )
				.fadeIn( 'fast' );
		} )
		.on( 'mouseleave', '.fee-edit-thumbnail', function() {
			$( this )
				.find( '#remove-post-thumbnail' )
				.fadeOut( 'fast' );
		} )
		.on( 'click', '#wp-fee-set-post-thumbnail', function() {
			$( '.fee-edit-thumbnail' )
				.removeClass( 'empty' );
			$( '#set-post-thumbnail' )
				.click();
		} )
		.on( 'click', '.media-modal-close', function() {
			if ( ! $( '.fee-edit-thumbnail' ).find( 'img' ).not( '.wp-fee-thumbnail-dummy' ).length ) {
				$( '.fee-edit-thumbnail' ).addClass( 'empty' );
			}
		} )
		.on( 'click', '.wp-fee-shortcode-container', function() {
			$( this )
				.find( '.wp-fee-shortcode-options' )
				.fadeOut( 'fast' );
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

			var content = $( '#wp-fee-content-' + wpFee.postId ),
				postBody = $( '.wp-fee-post' ),
				title = false,
				title1, title2, title3, title4, title5;
			
			// Most likely case and safest bet.
			if ( ( title1 = $( '.wp-fee-post .entry-title' ) ) && postBody.length && postBody.hasClass( 'post-' + wpFee.postId ) && title1.length ) {
				title = title1.first();
			// If there are multiple elements with a entry-title class (which is *very* unlikely), it will only use the first one anyway.
			} else if ( ( title2 = $( '.entry-title' ) ) && title2.length && title2.text() === wpFee.postTitle ) {
				title = title2.first();
			// Try h1, h2 and h3, but not in the content. Themes should be recommended to use entry-title.
			} else if ( ( title3 = $( 'h1' ).not( '.wp-fee-content h1' ) ) && title3.length ) {
				title3.each( function() {
					if ( $( this ).text() === wpFee.postTitle ) {
						title = $( this );
						return;
					}
				} );
				if ( ! title && ( title4 = $( 'h2' ).not( '.wp-fee-content h2' ) ) && title4.length ) {
					title4.each( function() {
						if ( $( this ).text() === wpFee.postTitle ) {
							title = $( this );
							return;
						}
					} );
					if ( ! title && ( title5 = $( 'h3' ).not( '.wp-fee-content h3' ) ) && title5.length ) {
						title5.each( function() {
							if ( $( this ).text() === wpFee.postTitle ) {
								title = $( this );
								return;
							}
						} );
					}
				}
			}

			if ( title ) {

				var docTitle = ( title.text().length ? document.title.replace( title.text(), '<!--replace-->' ) : document.title );

				title
					.text( wpFee.postTitleRaw )
					.attr( 'contenteditable', 'true' )
					.addClass( 'wp-fee-title' )
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
			}
			
			content
				.attr( 'contenteditable', 'true' );

			tinyMCE
				.init( {
					selector: '#wp-fee-content-' + wpFee.postId,
					inline: true,
					plugins: 'wpfeelink charmap paste textcolor table',
					toolbar1: 'kitchensink formatselect bold italic underline strikethrough blockquote alignleft aligncenter alignright alignjustify link media undo redo',
					toolbar2: 'kitchensink removeformat bullist numlist outdent indent forecolor backcolor table',
					menubar: false,
					fixed_toolbar_container: '#wp-admin-bar-wp-fee-mce-toolbar',
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
							$( '.mce-i-media' )
								.parent()
								.data( 'editor', 'fee-edit-content-' + wpFee.postId )
								.addClass( 'insert-media add_media' );
						}, 2000 );
						editor.addButton( 'kitchensink', {
							title: 'More...',
							onclick: function( event ) {
								var target = event.target || event.srcElement;
								var toolbar = $( target )
									.parents( '.mce-toolbar' );
								console.log( toolbar );
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
								$( '#wp-admin-bar-wp-fee-mce-toolbar' )
									.find( '*' )
									.not( '.mce-toolbar' )
									.not( '.mce-preview' )
									.removeAttr( 'style' );
							} )
							.on( 'DOMNodeInserted', function() {
								$( '#wp-admin-bar-wp-fee-mce-toolbar' )
									.find( '*' )
									.not( '.mce-toolbar' )
									.not( '.mce-preview' )
									.removeAttr( 'style' );
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
			var boxPos = {}, first;
			$( '#wp-fee-meta-modal .media-frame-content' ).scroll( function() {
				var boxTop = $( '#wp-fee-meta-modal .media-frame-content' ).scrollTop();
				$.each( boxPos, function( k, el ) {
					if ( el.bottom >= boxTop ) {
						first = el;
						return false;
					}
				});
				$( '#media-menu-' + first.id )
					.addClass( 'active' )
					.siblings()
					.removeClass( 'active' );
				$( '#wp-fee-meta-modal .media-frame-title h1' )
					.text( first.title )
					.data( 'box', first.id );
			} );
			$( '.fee-edit-thumbnail' )
				.append( '<img src="' + wpFee.blankGif + '" alt="" class="attachment-post-thumbnail wp-post-image wp-fee-thumbnail-dummy">' );
			$( '.fee-edit-thumbnail' )
				.on( 'mouseenter', function() {
					$( this )
						.find( '.fee-edit-thumbnail-button' )
						.fadeIn( 'fast' );
				} )
				.on( 'mouseleave', function() {
					$( this )
						.find( '.fee-edit-thumbnail-button' )
						.fadeOut( 'fast' );
				} );
			$( '#wp-fee-meta-modal .media-menu a, #wp-fee-meta-modal .media-frame-title h1, .wp-fee-meta-modal-box' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( '#wp-fee-meta-modal .media-frame-content' )
						.scrollTop( $( '#wp-fee-meta-modal .media-frame-content' ).scrollTop() + $( '#wp-fee-meta-modal-box-' + $( this ).data( 'box' ) ).position().top + 1 );
				} );
			$( '#wp-admin-bar-wp-fee-meta a' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( '#wp-fee-meta-modal' )
						.show();
					$( '#wp-fee-meta-modal' )
						.show();
					var boxes = $( '.wp-fee-meta-modal-box' );
					boxes.each( function( i ) {
						boxPos[$(this).position().top] = {
							id: $(this).data( 'box' ),
							bottom: $(this).position().top + $(this).height() - 20,
							title: $(this).find( 'h1' ).text()
						};
						if ( i == ( boxes.length - 1 ) ) {
							$(this).height( $(this).parent().height() + 1 );
						}
					});
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
			$( 'time, .entry-date' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( '#wp-fee-meta-modal' )
						.show();
					$( '#media-menu-submitdiv' )
						.trigger( 'click' );
					$( 'a.edit-timestamp' )
						.trigger( 'click' );
				} );
			$( '#wp-fee-meta-modal .media-modal-close, #wp-fee-met-continue' )
				.on( 'click', function( event ) {
					event
						.preventDefault();
					$( '#wp-fee-meta-modal' )
						.hide();
				} );
			var postFormat = ( $( 'input[name=post_format]:checked' ).val() === '0' ? 'standard' : $( 'input[name=post_format]:checked' ).val() );
			$( 'input[name=post_format]' )
				.change( function () {
					$( '.wp-fee-post' )
						.removeClass( 'format-' + postFormat );
					$( '.wp-fee-body' )
						.removeClass( 'single-format-' + postFormat );
					postFormat = ( $( this ).val() === '0' ? 'standard' : $( this ).val() );
					$( '.wp-fee-post' )
						.addClass( 'format-' + postFormat );
					$( '.wp-fee-body' )
						.addClass( 'single-format-' + postFormat );
				} );
			$( '.wp-fee-submit' )
				.on( 'click', function( event ) {
					var sumbitButton = $( this );
					if ( sumbitButton.hasClass( 'button-primary-disabled' ) || sumbitButton.hasClass( 'button-disabled' ) )
						return;
					sumbitButton
						.addClass( sumbitButton.hasClass( 'button-primary' ) ? 'button-primary-disabled' : 'button-disabled' )
						.text( sumbitButton.data( 'working' ) );

					if ( title.length ) {
						var postTitle = title
							.text();
					}

					if ( $( content ).length ) {
						var postContent = tinyMCE
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
					}

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
							window.location.href = window.location.href;
						}
					} )
					.fail( function() {
						alert( 'An error occurred.' );
					} );
				} );
		} );
} ( jQuery, this ) );
