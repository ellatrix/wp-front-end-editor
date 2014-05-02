/* global wpFee, tinymce, setPostThumbnailL10n, autosaveL10n, wpCookies, alert  */
( function( $, globals, window ) {
	'use strict';
	var frame;
	wp.fee = wp.fee || {};
	$.extend( wp.fee, wpFee, {
		boxPos: {},
		serializeObject: function() {
			var object = {},
				array = this.serializeArray();
			$.each( array, function() {
				if ( object[this.name] !== undefined ) {
					if ( ! object[this.name].push ) {
						object[this.name] = [object[this.name]];
					}
					object[this.name].push( this.value || '' );
				} else {
					object[this.name] = this.value || '';
				}
			} );
			return object;
		},
		recalcBoxPos: function() {
			var boxes = $( '.wp-fee-meta-modal-box' );
			boxes.each( function( i ) {
				wp.fee.boxPos[$(this).position().top] = {
					id: $(this).data( 'box' ),
					bottom: $(this).position().top + $(this).height() - 20,
					title: $(this).find( 'h1' ).text()
				};
				$( this ).removeAttr( 'style' );
				if ( i === ( boxes.length - 1 ) ) {
					$(this).height( $(this).parent().parent().height() + 1 );
				}
			} );
		},
		createPadNode: function( editor ) {
			return editor.dom.create( 'p', { 'data-wpview-pad': 1 },
				( tinymce.Env.ie && tinymce.Env.ie < 11 ) ? '' : '<br data-mce-bogus="1" />' );
		},
		send_to_editor: function( content ) {
			if ( content.slice( 0, 8 ) === '[gallery' || content.slice( 0, 8 ) === '[caption' ) {
				var data = {
						'action': 'wp_fee_shortcode',
						'shortcode': content,
						'post_id': wp.fee.post.id()
					};
				$.post( wp.fee.ajaxUrl, data, function( data ) {
					var editor = tinymce.activeEditor,
						dom = editor.dom,
						body, padNode, caret;
					editor.insertContent( data );
					body = editor.getBody();
					if ( dom.hasClass( body.firstChild, 'wp-fee-shortcode-container' ) ) {
						padNode = wp.fee.createPadNode( editor );
						body.insertBefore( padNode, body.firstChild );
					}
					if ( dom.hasClass( body.lastChild, 'wp-fee-shortcode-container' ) ) {
						padNode = wp.fee.createPadNode( editor );
						body.appendChild( padNode, body.firstChild );
					}
					caret = editor.selection.getNode();
					while ( caret && ! dom.hasClass( caret, 'mce-content-body' ) ) {
						if ( dom.hasClass( caret, 'wp-fee-shortcode-container' ) ) {
							editor.selection.setCursorLocation( dom.getNext( caret, '*' ), 0 );
						}
						caret = caret.parentNode;
					}
				} );
			} else {
				tinymce.activeEditor.insertContent( content );
			}
		},
		removeToolbarStyles: function() {
			$( '#wp-admin-bar-wp-fee-mce-toolbar' ).find( '*' ).not( '.mce-toolbar' ).not( '.mce-preview' ).removeAttr( 'style' );
		},
		convertReplace: function( n, o ) {
			var post = {
					'action': 'wp_fee_shortcode',
					'shortcode': n
				};
			$.post( wp.fee.ajaxUrl, post, function( n ) {
				$( o ).children().first().replaceWith( $( n ).children().first() );
				$( o ).children().eq(1).replaceWith( $( n ).children().eq(1) );
			} );
		},
		WPRemoveThumbnail: function( nonce ) {
			$.post( wp.fee.ajaxUrl, {
				action: 'set-post-thumbnail',
				post_id: wp.fee.post.id(),
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
		},
		onbeforeunload: function() {
			if ( tinymce.get( 'wp-fee-content-' + wp.fee.post.id() ).isDirty() )
				return autosaveL10n.saveAlert;
		},
		post: {
			id: function() {
				return $( '#post_ID' ).val() || 0;
			},
			title: function() {
				return $( '#post_title' ).val() || '';
			},
			content: function( type ) {
				var content;
				if ( typeof tinymce !== 'undefined' ) {
					if ( type === 'raw' ) {
						content = tinymce.get( 'wp-fee-content-' + wp.fee.post.id() ).getContent( {
							format: 'raw'
						} );
					} else {
						content = tinymce.get( 'wp-fee-content-' + wp.fee.post.id() ).getContent();
						content = $( '<div>' + content + '</div>' );
						content.find( '.wp-fee-shortcode' )
							.each( function() {
								$( this ).parents( '.wp-fee-shortcode-container' ).replaceWith( $( this ).html() );
							} );
						content = $( content ).html();
					}
				}
				return content || '';
			},
			excerpt: function() {
				return $( '#excerpt' ).val() || '';
			},
			type: function() {
				return $( '#post_type' ).val() || '';
			},
			author: function() {
				return $( '#post_author' ).val() || '';
			},
			_wpnonce: function() {
				return $( '#_wpnonce' ).val() || '';
			}
		}
	} );

	globals.wpActiveEditor = null;
	globals.send_to_editor = wp.fee.send_to_editor;
	globals.WPRemoveThumbnail = wp.fee.WPRemoveThumbnail;
	$.fn.serializeObject = wp.fee.serializeObject;
	window.onbeforeunload = wp.fee.onbeforeunload;

	$( window )
		.on( 'resize DOMNodeInserted', function() {
			wp.fee.removeToolbarStyles();
			wp.fee.recalcBoxPos();
		} );

	$( document )
		.on( 'autosave-enable-buttons', function() {
			$( '.wp-fee-submit' ).each( function() {
				$( this ).removeClass( $( this ).hasClass( 'button-primary' ) ? 'button-primary-disabled' : 'button-disabled' );
			} );
		} )
		.on( 'autosave-disable-buttons', function() {
			$( '.wp-fee-submit' ).each( function() {
				$( this ).addClass( $( this ).hasClass( 'button-primary' ) ? 'button-primary-disabled' : 'button-disabled' );
			} );
		} )
		.on( 'mouseenter', '.wp-fee-shortcode-container', function() {
			$( this ).find( '.wp-fee-shortcode-options' ).fadeIn( 'fast' );
		} )
		.on( 'mouseleave', '.wp-fee-shortcode-container', function() {
			$( this ).find( '.wp-fee-shortcode-options' ).fadeOut( 'fast' );
		} )
		.on( 'mouseenter', '.fee-edit-thumbnail', function() {
			$( this ).find( '#remove-post-thumbnail' ).fadeIn( 'fast' );
		} )
		.on( 'mouseleave', '.fee-edit-thumbnail', function() {
			$( this ).find( '#remove-post-thumbnail' ).fadeOut( 'fast' );
		} )
		.on( 'click', '#wp-fee-set-post-thumbnail', function( event ) {
			event.preventDefault();
			$( '.fee-edit-thumbnail' ).removeClass( 'empty' );
			$( '#set-post-thumbnail' ).click();
		} )
		.on( 'click', '.wp-fee-set-post-thumbnail', function( event ) {
			event.preventDefault();
			$( '#wp-fee-set-post-thumbnail' ).click();
		} )
		.on( 'click', '.media-modal-close', function() {
			if ( ! $( '.fee-edit-thumbnail' ).find( 'img' ).length ) {
				$( '.fee-edit-thumbnail' ).addClass( 'empty' );
			}
		} )
		.on( 'click', '.wp-fee-shortcode-view', function( event ) {
			event.preventDefault();
			$( this ).parents( '.wp-fee-shortcode-container' ).find( '.wp-fee-shortcode-options' ).fadeOut( 'fast' );
		} )
		.on( 'click', '.wp-fee-shortcode-remove', function( event ) {
			event.preventDefault();
			$( this ).parents( '.wp-fee-shortcode-container' ).remove();
		} )
		.on( 'click', '.wp-fee-shortcode-edit', function( event ) {
			event.preventDefault();
			var container = $( this ).parents( '.wp-fee-shortcode-container' ),
				shortcode, gallery, img, id;
			switch ( $( this ).data( 'kind' ) ) {
				case 'gallery':
					shortcode = container.children( '.wp-fee-shortcode' ).html();
					gallery = wp.media.gallery;
					gallery.edit( shortcode ).state('gallery-edit')
						.on( 'update', function( selection ) {
							shortcode = gallery.shortcode( selection ).string();
							wp.fee.convertReplace( shortcode, container );
						} );
					break;
				case 'caption':
					img = container.find( 'img' ).attr( 'class' );
					id = img.match( /wp-image-([\d]*)/i )[1];
					if ( frame ) {
						frame.open();
					} else {
						frame = wp.media( {
								title : 'Edit Media',
								frame: 'post',
								button : {
									text : 'Edit Media'
								}
							} );
						frame
							.on( 'open', function() {
								var selection = frame.state().get( 'selection' ),
									attachment = wp.media.attachment( id );
								attachment.fetch();
								selection.add( attachment ? [ attachment ] : [] );
							} )
							.on( 'insert', function() {
								var selection = frame.state().get( 'selection' ).first(),
									display;
								if ( ! selection )
									return;
								display = frame.state().display( selection ).toJSON();
								wp.media.editor.send.attachment( display, selection.toJSON() )
									.done( function() {
										wp.fee.convertReplace( arguments[0], container );
									} );
							} )
							.open();
					}
					break;
			}
		} )
		.on( 'keydown', function( event ) {
			if ( event.keyCode === 83 && ( navigator.platform.match( 'Mac' ) ? event.metaKey : event.ctrlKey ) ) {
				event.preventDefault();
				event.stopPropagation();
				$( '#wp-fee-save' ).trigger( 'click' );
			}
			if ( event.keyCode === 27 ) {
				event.preventDefault();
				event.stopPropagation();
				window.location.href = $( '#wp-admin-bar-wp-fee-close a' ).attr( 'href' );
			}
		} )
		.on( 'click', '.wp-fee-content a', function( event ) {
			event.preventDefault();
		} )
		.on( 'click', '.error .dashicons-dismiss, .updated .dashicons-dismiss', function( event ) {
			event.preventDefault();
			$( this ).parent().fadeOut( 'slow' );
		} )
		.ready( function() {
			var postBody = $( '.wp-fee-post' ),
				title = false,
				title1, title2, title3, title4, title5, docTitle, postFormat;
			
			$( '#message' ).delay( 5000 ).fadeOut( 'slow' );
			$( '.notification-dialog-wrap' ).addClass( 'wp-core-ui' );
			
			// Most likely case and safest bet.
			if ( ( title1 = $( '.wp-fee-post .entry-title' ) ) && postBody.length && postBody.hasClass( 'post-' + wp.fee.post.id() ) && title1.length ) {
				wp.fee.title = title1.first();
			// If there are multiple elements with a entry-title class (which is *very* unlikely), it will only use the first one anyway.
			} else if ( ( title2 = $( '.entry-title' ) ) && title2.length && title2.text() === wp.fee.postTitle ) {
				wp.fee.title = title2.first();
			// Try h1, h2 and h3, but not in the content. Themes should be recommended to use entry-title.
			} else if ( ( title3 = $( 'h1' ).not( '.wp-fee-content h1' ) ) && title3.length ) {
				title3.each( function() {
					if ( $( this ).text() === wp.fee.postTitle ) {
						wp.fee.title = $( this );
						return;
					}
				} );
				if ( ! title && ( title4 = $( 'h2' ).not( '.wp-fee-content h2' ) ) && title4.length ) {
					title4.each( function() {
						if ( $( this ).text() === wp.fee.postTitle ) {
							wp.fee.title = $( this );
							return;
						}
					} );
					if ( ! title && ( title5 = $( 'h3' ).not( '.wp-fee-content h3' ) ) && title5.length ) {
						title5.each( function() {
							if ( $( this ).text() === wp.fee.postTitle ) {
								wp.fee.title = $( this );
								return;
							}
						} );
					}
				}
			}

			if ( wp.fee.title ) {

				docTitle = ( wp.fee.title.text().length ? document.title.replace( wp.fee.title.text(), '<!--replace-->' ) : document.title );

				wp.fee.title.text( wp.fee.post.title() ).attr( 'contenteditable', 'true' ).addClass( 'wp-fee-title' )
					.on( 'keyup', function() {
						document.title = docTitle.replace( '<!--replace-->', $( this ).text() );
					} )
					.on( 'keypress', function( event ) {
						return event.which !== 13;
					} )
					.on( 'blur', function() {
						var titleOnBlur;
						$( this ).find( '*' )
							.each( function() {
								titleOnBlur = $( this ).contents();
								$(this).replaceWith( titleOnBlur );
							} );
					} );
			}

			tinymce.init( wp.fee.tinymce );

			if ( wp.fee.title ) {
				$( '#post_title' ).on( 'change keyup', function() {
					wp.fee.title.text( $( this ).val() );
				});
				wp.fee.title.on( 'change keyup', function() {
					$( '#post_title' ).val( $( this ).text() );
				});
			}
			$( '#wp-fee-meta-modal .media-frame-content' ).scroll( function() {
				var boxTop = $( '#wp-fee-meta-modal .media-frame-content' ).scrollTop(),
					first;
				$.each( wp.fee.boxPos, function( k, el ) {
					if ( el.bottom >= boxTop ) {
						first = el;
						return false;
					}
				});
				if ( first ) {
					$( '#media-menu-' + first.id ).addClass( 'active' ).siblings().removeClass( 'active' );
					$( '#wp-fee-meta-modal .media-frame-title h1' ).text( first.title ).data( 'box', first.id );
				}
			} );
			$( '.fee-edit-thumbnail' )
				.on( 'mouseenter', function() {
					$( this ).find( '.fee-edit-thumbnail-button' ).fadeIn( 'fast' );
				} )
				.on( 'mouseleave', function() {
					$( this ).find( '.fee-edit-thumbnail-button' ).fadeOut( 'fast' );
				} );
			$( '#wp-fee-meta-modal .media-menu a, #wp-fee-meta-modal .media-frame-title h1, .media-frame-sub-title' )
				.on( 'click', function( event ) {
					event.preventDefault();
					$( '#wp-fee-meta-modal .media-frame-content' ).scrollTop( $( '#wp-fee-meta-modal-box-' + $( this ).data( 'box' ) ).position().top + 1 );
				} );
			$( '#wp-admin-bar-wp-fee-backend a' )
				.tipsy( { className: 'tipsy-bar' } );
			$( '#wp-admin-bar-wp-fee-close a' )
				.tipsy( { gravity: 'ne', className: 'tipsy-bar' } );
			$( '#wp-admin-bar-wp-fee-meta a' )
				.tipsy( { className: 'tipsy-bar' } )
				.on( 'click', function( event ) {
					event.preventDefault();
					$( '#wp-fee-meta-modal' ).show();
					wp.fee.recalcBoxPos();
				} );
			$( '#wp-admin-bar-wp-fee-delete a' )
				.tipsy( { className: 'tipsy-bar' } );
			$( '#wp-admin-bar-wp-fee-cats a' )
				.tipsy( { className: 'tipsy-bar' } );
			$( '#wp-admin-bar-wp-fee-cats a, a[rel~="category"]' )
				.on( 'click', function( event ) {
					event.preventDefault();
					$( '#wp-fee-meta-modal' ).show();
					wp.fee.recalcBoxPos();
					$( '#media-menu-categorydiv' ).trigger( 'click' );
				} );
			$( '#wp-admin-bar-wp-fee-tags a' )
				.tipsy( { className: 'tipsy-bar' } );
			$( '#wp-admin-bar-wp-fee-tags a, a[rel="tag"]' )
				.on( 'click', function( event ) {
					event.preventDefault();
					$( '#wp-fee-meta-modal' ).show();
					wp.fee.recalcBoxPos();
					$( '#media-menu-tagsdiv-post_tag' ).trigger( 'click' );
				} );
			$( 'time, .entry-date' )
				.on( 'click', function( event ) {
					event.preventDefault();
					$( '#wp-fee-meta-modal' ).show();
					wp.fee.recalcBoxPos();
					$( '#media-menu-submitdiv' ).trigger( 'click' );
					$( 'a.edit-timestamp' ).trigger( 'click' );
				} );
			$( '#wp-fee-meta-modal .media-modal-close, #wp-fee-met-continue' )
				.on( 'click', function( event ) {
					event.preventDefault();
					$( '#wp-fee-meta-modal' ).hide();
				} );
			postFormat = ( postFormat = $( 'input[name=post_format]:checked' ).val() === '0' ? 'standard' : postFormat );
			$( 'input[name=post_format]' )
				.change( function () {
					$( '.wp-fee-post' ).removeClass( 'format-' + postFormat );
					$( '.wp-fee-body' ).removeClass( 'single-format-' + postFormat );
					postFormat = ( $( this ).val() === '0' ? 'standard' : $( this ).val() );
					$( '.wp-fee-post' ).addClass( 'format-' + postFormat );
					$( '.wp-fee-body' ).addClass( 'single-format-' + postFormat );
				} );
			$( '.wp-fee-submit' )
				.on( 'click', function() {
					var sumbitButton = $( this ),
						postData, metaData;
					if ( sumbitButton.hasClass( 'button-primary-disabled' ) || sumbitButton.hasClass( 'button-disabled' ) )
						return;
					sumbitButton
						.addClass( sumbitButton.hasClass( 'button-primary' ) ? 'button-primary-disabled' : 'button-disabled' )
						.text( sumbitButton.data( 'working' ) );

					postData = {
						'action': 'wp_fee_post',
						'post_ID': wp.fee.post.id(),
						'post_title': wp.fee.post.title(),
						'post_content': wp.fee.post.content(),
						'publish' : ( sumbitButton.attr( 'id' ) === 'wp-fee-publish' ) ? 'Publish' : undefined,
						'save' : ( sumbitButton.attr( 'id' ) === 'wp-fee-save' ) ? 'Save' : undefined,
						'_wpnonce': wp.fee.post._wpnonce()
					},
					metaData = $( 'form' ).serializeObject();

					$.extend( postData, metaData );

					$.post( wp.fee.ajaxUrl, postData, function( redirect ) {
						wpCookies.set( 'wp-saving-post-' + wp.fee.post.id(), 'saved' );
						window.onbeforeunload = null;
						window.location.href = redirect;
					} )
					.fail( function() {
						alert( 'An error occurred.' );
					} );
				} );
		} );
} ( jQuery, this, window ) );
