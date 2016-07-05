( function( data, $, api, heartbeat ) {
	heartbeat.interval( 15 );

	$( function() {
		var tinymce = window.tinymce,
			VK = tinymce.util.VK,
			feeL10n = window.feeL10n,
			hidden = true,
			$window = $( window ),
			$document = $( document ),
			$body = $( document.body ),
			$postClass = $( '.fee-post' ),
			$editLinks = $( 'a[href="#fee-edit-link"]' ),
			$hasPostThumbnail = $( '.has-post-thumbnail' ),
			$thumbnail = $( '.fee-thumbnail' ),
			$thumbnailWrap = $( '.fee-thumbnail-wrap' ),
			$thumbnailEdit = $( '.fee-edit-thumbnail' ).add( '.fee-insert-thumbnail' ),
			$thumbnailRemove = $( '.fee-remove-thumbnail' ),
			$toolbar = $( '.fee-toolbar' ),
			$buttons = $toolbar.find( '.button' ).add( $( '.fee-save-and-exit' ) ),
			$content = $( '.fee-content' ),
			$contentOriginal = $( '.fee-content-original' ),
			$leave = $( '.fee-leave' ),
			$contentParents = $content.parents(),
			$titleTags, $titles, $title, docTitle,
			titleEditor, contentEditor,
			editors = [],
			initializedEditors = 0,
			releaseLock = true,
			checkNonces, timeoutNonces;

		var count = 0;
		var loader = {
			start: function() {
				if ( ! count ) {
					$body.addClass( 'progress' );
				}

				count++;
			},
			stop: function() {
				if ( count ) {
					count--;
				}

				if ( ! count ) {
					$body.removeClass( 'progress' );
				}
			}
		};

		var post = new wp.api.models[ data.post.type === 'page' ? 'Page' : 'Post' ]();

		post.set( post.parse( data.post ) );

		function post_title( content, notself ) {
			if ( content ) {
				if ( docTitle ) {
					document.title = docTitle.replace( '<!--replace-->', content );
				}

				$titles.each( function( i, title ) {
					title.innerHTML = content;
				} );

				if ( ! notself ) {
					$title.get( 0 ).innerHTML = content;
				}

				return post_title();
			}

			if ( titleEditor ) {
				return titleEditor.getContent() || '';
			} else {
				return post.get( 'title' ).raw;
			}
		}

		function post_content( content ) {
			var returnContent;

			if ( content && content !== 'raw' && content !== 'html' ) {
				contentEditor.undoManager.add();
				contentEditor.setContent( content );

				return post_content();
			}

			returnContent = contentEditor.getContent( {
				format: content || 'html'
			} ) || '';

			if ( content !== 'raw' ) {
				returnContent = returnContent.replace( /<p>(?:<br ?\/?>|\u00a0|\uFEFF| )*<\/p>/g, '<p>&nbsp;</p>' );
				returnContent = window.switchEditors.pre_wpautop( returnContent );
			}

			return returnContent;
		}

		function scheduleNoncesRefresh() {
			checkNonces = false;
			clearTimeout( timeoutNonces );
			timeoutNonces = setTimeout( function() {
				checkNonces = true;
			}, 300000 );
		}

		scheduleNoncesRefresh();

		function on() {
			if ( ! hidden ) {
				return;
			}

			$( '#wp-admin-bar-edit' ).addClass( 'active' );
			$body.removeClass( 'fee-off' ).addClass( 'fee-on' );
			$hasPostThumbnail.addClass( 'has-post-thumbnail' );

			getEditors( function( editor ) {
				editor.show();
			} );

			if ( wp.autosave ) {
				wp.autosave.local.resume();
				wp.autosave.server.resume();
			}

			$document.trigger( 'fee-on' );

			hidden = false;
		}

		function off( location ) {
			if ( hidden || post.get( 'status' ) === 'auto-draft' ) {
				return;
			}

			isDirty() ? leaveMessage( function() {
				_off( location );
			} ) : _off( location );
		}

		function _off( location ) {
			if ( wp.autosave ) {
				wp.autosave.local.suspend();
				wp.autosave.server.suspend();
			}

			$( '#wp-admin-bar-edit' ).removeClass( 'active' );
			$body.removeClass( 'fee-on' ).addClass( 'fee-off' );
			if ( ! $thumbnail.find( 'img' ).length ) {
				$hasPostThumbnail.removeClass( 'has-post-thumbnail' );
			}

			titleEditor.hide();

			$title.html( post.get( 'title' ).raw );
			$titles.html( post.get( 'title' ).raw );

			if ( docTitle ) {
				document.title = docTitle.replace( '<!--replace-->', post.get( 'title' ).rendered );
			}

			$document.trigger( 'fee-off' );

			hidden = true;

			if ( location ) {
				document.location.href = location;
			}
		}

		function toggle() {
			hidden ? on() : off();
		}

		function isOn() {
			return ! hidden;
		}

		function isOff() {
			return hidden;
		}

		function save( callback, _publish ) {
			$document.trigger( 'fee-before-save' );

			$buttons.prop( 'disabled', true );
			loader.start();

			var post = new wp.api.models[ data.post.type === 'page' ? 'Page' : 'Post' ]();

			if ( _publish ) {
				post.set( { status: 'publish' } );
			}

			post
			.save( {
				content: post_content(),
				title: post_title(),
			} )
			.always( function() {
				$buttons.prop( 'disabled', false );
				loader.stop();
			} )
			.done( function( data ) {
				// Update the post content.
				$contentOriginal.html( data.processedPostContent );
				// Invalidate the browser backup.
				window.wpCookies.set( 'wp-saving-post-' + post.get( 'id' ), 'saved' );
				// Add an undo level for all editors.
				addUndoLevel();
				// The editors are no longer dirty.
				// initialPost = getPost();

				$document.trigger( 'fee-after-save' );

				callback && callback();
			} )
			.fail( function( data ) {
				console.log( data );
			} );
		}

		function publish( callback ) {
			save( callback, true );
			$( '#wp-admin-bar-edit-publish' ).hide();
			$( '#wp-admin-bar-edit-save > a' ).text( 'Update' );
		}

		function isDirty() {
			if ( hidden ) {
				return;
			}

			return true;

			// return _.some( arguments.length ? arguments : [ 'title', 'content' ], function( key ) {
			// 	if ( initialPost[ key ] && wp.fee.post[ key ] ) {
			// 		return wp.fee.post[ key ]() !== initialPost[ key ];
			// 	}

			// 	return;
			// } );
		}

		function addUndoLevel() {
			if ( hidden ) {
				return;
			}

			getEditors( function( editor ) {
				editor.undoManager.add();
			} );
		}

		function leaveMessage( callback ) {
			$leave.show();
			$leave.find( '.fee-exit' ).focus().on( 'click.fee', function() {
				callback();
				$leave.hide();
			} );
			$leave.find( '.fee-save-and-exit' ).on( 'click.fee', function() {
				save( callback );
				$leave.hide();
			} );
			$leave.find( '.fee-cancel' ).on( 'click.fee', function() {
				$leave.hide();
			} );
		}

		function getEditors( callback ) {
			_.each( editors, callback );
		}

		function registerEditor( editor ) {
			editors.push( editor );

			editor.on( 'init', function() {
				// editor.hide();

				initializedEditors++;

				if ( initializedEditors === editors.length ) {
					$document.trigger( 'fee-editor-init' );
				}
			} );
		}

		tinymce.init( _.extend( data.tinymce, {
			setup: function( editor ) {
				contentEditor = editor;
				window.wpActiveEditor = editor.id;

				registerEditor( editor );

				// Remove spaces from empty paragraphs.
				editor.on( 'BeforeSetContent', function( event ) {
					if ( event.content ) {
						event.content = event.content.replace( /<p>(?:&nbsp;|\s)+<\/p>/gi, '<p><br></p>' );
					}
				} );
			}
		} ) );

		function titleInit() {
			var i,
				indexes = {};

			$titleTags = $( '.fee-title' );
			$titles = $titleTags.parent();
			$titleTags.remove();

			// Try: $postClass.find( '.entry-title' )?
			$title = [];

			! $title.length && $titles.each( function( i, title ) {
				$( title ).parents().each( function( i, titleParent ) {
					var index = $.inArray( titleParent, $contentParents );

					if ( index > -1 ) {
						indexes[ index ] = indexes[ index ] || [];
						indexes[ index ].push( title );
						return false;
					}
				} );
			} );

			for ( i in indexes ) {
				$title = $( indexes[ i ] );

				break;
			}

			if ( $title.length ) {
				$title = $title.first();
				$titles = $titles.not( $title );

				docTitle = ( $title.text().length ? document.title.replace( $title.text(), '<!--replace-->' ) : document.title );

				$title.addClass( 'fee-title' );

				tinymce.init( {
					selector: '.fee-title',
					theme: 'fee',
					paste_as_text: true,
					plugins: 'paste',
					inline: true,
					placeholder: feeL10n.title,
					entity_encoding: 'raw',
					setup: function( editor ) {
						titleEditor = editor;

						registerEditor( editor );

						editor.on( 'init', function() {
							editor.hide();
						} );

						editor.on( 'setcontent keyup', function() {
							post_title( post_title(), true );
						} );

						editor.on( 'keydown', function( event ) {
							if ( event.keyCode === 13 ) {
								contentEditor.focus();
								event.preventDefault();
							}
						} );
					}
				} );
			}
		}

		titleInit();

		$window
		.on( 'beforeunload.fee', function() {
			if ( ! hidden && isDirty() ) {
				( event || window.event ).returnValue = feeL10n.saveAlert;
				return feeL10n.saveAlert;
			}
		} )
		.on( 'unload.fee-remove-lock', function( event ) {
			if ( ! releaseLock ) {
				return;
			}

			if ( event.target && event.target.nodeName !== '#document' ) {
				return;
			}

			wp.ajax.post( 'wp-remove-post-lock', {
				_wpnonce: data.nonces.post,
				post_ID: post.get( 'id' ),
				active_post_lock: data.lock
			} );
		} );

		$document
		.on( 'fee-editor-init.fee', function() {
			if ( $body.hasClass( 'fee-on' ) || document.location.hash.indexOf( 'edit=true' ) !== -1 ) { // Lazy!
				on();
			}

			if ( $body.hasClass( 'fee-off' ) && ! $thumbnail.find( 'img' ).length ) {
				$hasPostThumbnail.removeClass( 'has-post-thumbnail' );
			}

			$document.on( 'autosave-restore-post', function( event, postData ) {
				post_title( postData.post_title );
				post_content( postData.content );
			} );
		} )
		.on( 'autosave-enable-buttons.fee', function() {
			$buttons.prop( 'disabled', false );
		} )
		.on( 'autosave-disable-buttons.fee', function() {
			if ( ! wp.heartbeat || ! wp.heartbeat.hasConnectionError() ) {
				$buttons.prop( 'disabled', true );
			}
		} )
		.on( 'keydown.fee', function( event ) {
			if ( event.keyCode === 83 && VK.metaKeyPressed( event ) ) {
				event.preventDefault();
				save();
			}
			if ( event.keyCode === 27 ) {
				event.preventDefault();
				off();
			}
		} )
		.on( 'heartbeat-send.fee-refresh-lock', function( event, data ) {
			data['wp-refresh-post-lock'] = {
				post_id: post.get( 'id' ),
				lock: data.lock
			};
		} )
		.on( 'heartbeat-tick.fee-refresh-lock', function( event, data ) {
			var received = data['wp-refresh-post-lock'],
				wrap, avatar;

			if ( received ) {
				if ( received.lock_error ) {
					wrap = $( '#post-lock-dialog' );

					if ( wrap.length && ! wrap.is( ':visible' ) ) {
						if ( wp.autosave ) {
							$document.one( 'heartbeat-tick', function() {
								wp.autosave.server.suspend();
								wrap.removeClass( 'saving' ).addClass( 'saved' );
								$window.off( 'beforeunload.edit-post' );
							} );

							wrap.addClass( 'saving' );
							wp.autosave.server.triggerSave();
						}

						if ( received.lock_error.avatar_src ) {
							avatar = $( '<img class="avatar avatar-64 photo" width="64" height="64" />' ).attr( 'src', received.lock_error.avatar_src.replace( /&amp;/g, '&' ) );
							wrap.find( 'div.post-locked-avatar' ).empty().append( avatar );
						}

						wrap.show().find( '.currently-editing' ).text( received.lock_error.text );
						wrap.find( '.wp-tab-first' ).focus();
					}
				} else if ( received.new_lock ) {
					data.lock = received.new_lock;
				}
			}
		} )
		.on( 'heartbeat-send.fee-refresh-nonces', function( event ) {
			if ( checkNonces ) {
				data['wp-refresh-post-nonces'] = {
					post_id: post.get( 'id' ),
					post_nonce: data.nonces.post
				};
			}
		} )
		.on( 'heartbeat-tick.fee-refresh-nonces', function( event, data ) {
			var nonces = data['wp-refresh-post-nonces'];

			if ( nonces ) {
				scheduleNoncesRefresh();

				// TODO
				/* if ( nonces.replace ) {
					$.each( nonces.replace, function( selector, value ) {
						$( '#' + selector ).val( value );
					});
				} */

				if ( nonces.heartbeatNonce ) {
					window.heartbeatSettings.nonce = nonces.heartbeatNonce;
				}
			}
		} );

		$( 'a' ).not( 'a[href^="#"]' ).on( 'click.fee', function( event ) {
			var $this = $( this );

			if ( isDirty() && ! VK.metaKeyPressed( event ) ) {
				event.preventDefault();

				leaveMessage( function() {
					_off( $this.attr( 'href' ) );
				} );
			}
		} );

		$( '#wp-admin-bar-edit-publish > a' ).on( 'click.fee', function( event ) {
			event.preventDefault();
			publish();
		} );

		$( '#wp-admin-bar-edit-save > a' ).on( 'click.fee', function( event ) {
			event.preventDefault();
			save();
		} );

		$( '#wp-admin-bar-edit > a' ).on( 'click.fee', function( event ) {
			event.preventDefault();
			on();
		} );

		$editLinks.on( 'click.fee', function( event ) {
			event.preventDefault();
			toggle();
		} );

		// Temporary.
		if ( $.inArray( post.get( 'status' ), [ 'publish', 'future', 'private' ] ) !== -1 ) {
			$( '#wp-admin-bar-edit-publish' ).hide();
			$( '#wp-admin-bar-edit-save > a' ).text( 'Update' );
		}

		_.extend( wp.media.featuredImage, {
			set: function( id ) {
				var settings = wp.media.view.settings;

				settings.post.featuredImageId = id;

				wp.media.post( 'fee_thumbnail', {
					post_ID: settings.post.id,
					thumbnail_ID: settings.post.featuredImageId,
					_wpnonce: settings.post.nonce,
					size: $thumbnail.data( 'size' )
				} ).done( function( html ) {
					$thumbnailWrap.html( html );
					$thumbnail.removeClass( 'fee-thumbnail-active' );

					if ( html === '' ) {
						$thumbnail.addClass( 'fee-empty' );
					} else {
						$thumbnail.removeClass( 'fee-empty' );
					}
				} );
			}
		} );

		$thumbnailEdit.on( 'click.fee-edit-thumbnail', function() {
			wp.media.featuredImage.frame().open();
		} );

		$thumbnailRemove.on( 'click.fee-remove-thumbnail', function() {
			wp.media.featuredImage.set( -1 );
		} );

		$thumbnail.on( 'click.fee-thumbnail-active', function() {
			if ( hidden || $thumbnail.hasClass( 'fee-empty' ) ) {
				return;
			}

			$thumbnail.addClass( 'fee-thumbnail-active' );

			$document.on( 'click.fee-thumbnail-active', function( event ) {
				if ( $thumbnail.get( 0 ) === event.target || $thumbnail.has( event.target ).length ) {
					return;
				}

				$thumbnail.removeClass( 'fee-thumbnail-active' );

				$document.off( 'click.fee-thumbnail-active' );
			} );
		} );

		window.fee.post_title = post_title;
		window.fee.post_content = post_content;
	} );
} )( window.fee, window.jQuery, window.wp.api, window.wp.heartbeat );
