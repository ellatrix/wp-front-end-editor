( function( $ ) {
	'use strict';

	window.wp = window.wp || {};
	wp.fee = {};

	wp.heartbeat.interval( 15 );

	_.extend( wp.fee, window.fee );

	$( function() {
		var tinymce = window.tinymce,
			feeL10n = window.feeL10n,
			hidden = true,
			$window = $( window ),
			windowWidth = $window.width(),
			$document = $( document ),
			$body = $( document.body ),
			$postClass = $( '.fee-post' ),
			$editLinks = $( 'a[href="#fee-edit-link"]' ),
			$hasPostThumbnail = $( '.has-post-thumbnail' ),
			$thumbnail = $( '.fee-thumbnail' ),
			$thumbnailWrap = $( '.fee-thumbnail-wrap' ),
			$thumbnailEdit = $( '.fee-edit-thumbnail' ),
			$thumbnailRemove = $( '.fee-remove-thumbnail' ),
			$buttons = $( '.fee-toolbar' ).find( '.button' ).add( $( '.fee-save-and-exit' ) ),
			$content = $( '.fee-content' ),
			$contentOriginal = $( '.fee-content-original' ),
			$categories = $( '.fee-categories' ),
			$leave = $( '.fee-leave' ),
			$noticeArea = $( '#fee-notice-area' ),
			$autoSaveNotice,
			$contentParents = $content.parents(),
			contentRect = $content.get( 0 ).getBoundingClientRect(),
			$titleTags, $titles, $title, docTitle,
			$url, $slug,
			titleEditor, slugEditor, contentEditor,
			editors = [],
			initializedEditors = 0,
			releaseLock = true,
			checkNonces, timeoutNonces,
			indexes = {},
			i;

		// This object's methods can be used to get the edited post data.
		// It falls back tot the post data on the server.
		wp.fee.post = {};

		_.each( wp.fee.postOnServer, function( value, key ) {
			wp.fee.post[ key ] = function() {
				return wp.fee.postOnServer[ key ];
			};
		} );

		wp.fee.post.post_ID = function() {
			return wp.fee.postOnServer.ID || 0;
		};

		wp.fee.post.post_title = function( content, notself ) {
			if ( content ) {
				document.title = docTitle.replace( '<!--replace-->', content );

				$titles.each( function( i, title ) {
					title.textContent = content;
				} );

				if ( ! notself ) {
					$title.get( 0 ).textContent = content;
				}

				return this.post_title();
			}

			return $title.get( 0 ).textContent || '';
		};

		wp.fee.post.post_name = function() {
			if ( $slug.length ) {
				return $slug.get( 0 ).textContent || '';
			}

			return '';
		};

		wp.fee.post.post_content = function( content ) {
			var returnContent;

			if ( content && content !== 'raw' && content !== 'html' ) {
				contentEditor.undoManager.add();
				contentEditor.setContent( content );

				return this.post_content();
			}

			returnContent = contentEditor.getContent( {
				format: content || 'html'
			} ) || '';

			if ( content !== 'raw' ) {
				returnContent = returnContent.replace( /<p>(?:<br ?\/?>|\u00a0|\uFEFF| )*<\/p>/g, '<p>&nbsp;</p>' );
				returnContent = window.switchEditors.pre_wpautop( returnContent );
			}

			return returnContent;
		};

		if ( contentRect.left >= windowWidth - contentRect.right ) {
			$body.addClass( 'fee-left' );
		} else {
			$body.addClass( 'fee-right' );
		}

		wp.fee.post.post_category = function( categories ) {
			var _categories = [];

			$( 'input[name="post_category[]"]:checked' ).each( function() {
				_categories.push( $( this ).val() );
			} );

			return _categories;
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

			if ( wp.autosave ) {
				wp.autosave.local.resume();
				wp.autosave.server.resume();
			}

			$( '#wp-admin-bar-edit' ).addClass( 'active' );
			$body.removeClass( 'fee-off' ).addClass( 'fee-on' );
			$hasPostThumbnail.addClass( 'has-post-thumbnail' );
			$title.text( wp.fee.postOnServer.post_title );

			getEditors( function( editor ) {
				editor.show();
			} );

			$document.trigger( 'fee-on' );

			hidden = false;
		}

		function off( location ) {
			if ( hidden ) {
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
			$title.text( wp.fee.postOnServer.post_title ).attr( 'contenteditable', 'false' );
			document.title = docTitle.replace( '<!--replace-->', wp.fee.postOnServer.post_title );
			$titles.text( wp.fee.postOnServer.post_title );

			getEditors( function( editor ) {
				editor.hide();
			} );

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
			var postData = {};

			$document.trigger( 'fee-before-save' );

			_.each( wp.fee.post, function( fn, key ) {
				postData[ key ] = fn();
			} );

			postData.publish = _publish ? true : undefined;
			postData.save = _publish ? undefined : true;
			postData._wpnonce = wp.fee.nonces.post;

			$buttons.prop( 'disabled', true );

			wp.ajax.post( 'fee_post', postData )
			.always( function() {
				$buttons.prop( 'disabled', false );
			} )
			.done( function( data ) {
				// Copy the new post object form the server.
				wp.fee.postOnServer = data.post;
				// Update the post content.
				$contentOriginal.html( data.processedPostContent );
				// Invalidate the browser backup.
				window.wpCookies.set( 'wp-saving-post-' + wp.fee.postOnServer.ID, 'saved' );
				// Add a message. :)
				data.message && addNotice( data.message, 'updated', true );
				// Add an undo level for all editors.
				addUndoLevel();
				// The editors are no longer dirty.
				isDirty( false );

				$document.trigger( 'fee-after-save' );

				callback && callback();
			} )
			.fail( function( data ) {
				data.message && addNotice( data.message, 'error' );
			} );
		}

		function publish( callback ) {
			save( callback, true );
		}

		function isDirty( dirty ) {
			if ( hidden ) {
				return;
			}

			var thisIsDirty = false;

			getEditors( function( editor ) {
				if ( dirty === false ) {
					editor.isNotDirty = true;
				} else if ( editor.isDirty() ) {
					thisIsDirty = true;
				}
			} );

			return thisIsDirty;
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
			} );
			$leave.find( '.fee-save-and-exit' ).on( 'click.fee', function() {
				save( callback );
			} );
			$leave.find( '.fee-cancel' ).on( 'click.fee', function() {
				$leave.hide();
			} );
		}

		function addNotice( html, type, remove ) {
			var $notice = $( '<div>' ).addClass( type );

			$notice.append(
				'<p>' + html + '</p>' +
				( remove === true ? '' : '<div class="dashicons dashicons-dismiss"></div>' )
			);

			$noticeArea.prepend( $notice );

			$notice.find( '.dashicons-dismiss' ).on( 'click.fee', function() {
				$notice.remove();

				if ( remove !== true ) {
					remove();
				}
			} );

			remove === true && $notice.delay( 5000 ).fadeOut( 'slow', function() {
				$notice.remove();
			} );

			return $notice;
		}

		function getEditors( callback ) {
			_.each( editors, callback );
		}

		function registerEditor( editor ) {
			editors.push( editor );

			editor.on( 'init', function() {
				editor.hide();

				initializedEditors++;

				if ( initializedEditors === editors.length ) {
					$document.trigger( 'fee-editor-init' );
				}
			} );
		}

		tinymce.init( _.extend( wp.fee.tinymce, {
			setup: function( editor ) {
				contentEditor = editor;
				window.wpActiveEditor = editor.id;

				registerEditor( editor );

				// Remove spaces from empty paragraphs.
				editor.on( 'BeforeSetContent', function( event ) {
					if ( event.content ) {
						event.content = event.content.replace( /<p>(?:&nbsp;|\u00a0|\uFEFF| )+<\/p>/gi, '<p></p>' );
					}
				} );
			}
		} ) );

		$titleTags = $( '.fee-title' );
		$titles = $titleTags.parent();
		$titleTags.remove();

		// Try: $postClass.find( '.entry-title' )
		$title = $( 'blabla' );

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
			$titles = $titles.not( $title );

			docTitle = ( $title.text().length ? document.title.replace( $title.text(), '<!--replace-->' ) : document.title );

			$title
			.addClass( 'fee-title' )
			.after( '<p class="fee-url">' + wp.fee.permalink.replace( /(?:%pagename%|%postname%)/, '<ins><span class="fee-slug">' + wp.fee.postOnServer.post_name + '</span></ins>' ) + '</p>' );

			$url = $( '.fee-url' );
			$slug = $( '.fee-slug' );

			tinymce.init( {
				selector: '.fee-title',
				theme: 'fee',
				paste_as_text: true,
				plugins: 'paste',
				inline: true,
				setup: function( editor ) {
					titleEditor = editor;

					registerEditor( editor );

					editor.on( 'setcontent keyup', function() {
						wp.fee.post.post_title( wp.fee.post.post_title(), true );
					} );

					editor.on( 'keydown', function( event ) {
						if ( event.keyCode === 13 ) {
							contentEditor.focus();
							event.preventDefault();
						}
					} );
				}
			} );

			tinymce.init( {
				selector: '.fee-slug',
				theme: 'fee',
				paste_as_text: true,
				plugins: 'paste',
				inline: true,
				setup: function( editor ) {
					slugEditor = editor;

					registerEditor( editor );

					editor.on( 'setcontent keyup', function() {
						if ( editor.dom.isEmpty( editor.getBody() ) ) {
							$slug.get( 0 ).textContent = '';
						}
					} );

					editor.on( 'keydown', function( event ) {
						if ( tinymce.util.VK.ENTER === event.keyCode ) {
							event.preventDefault();
						} else if ( tinymce.util.VK.SPACEBAR === event.keyCode ) {
							event.preventDefault();
							editor.insertContent( '-' );
						}
					} );

					editor.on( 'blur', function() {
						if ( editor.isDirty() ) {
							wp.ajax.post( 'fee_slug', {
								'post_ID': wp.fee.post.post_ID(),
								'post_title': wp.fee.post.post_title(),
								'post_name': wp.fee.post.post_name(),
								'_wpnonce': wp.fee.nonces.slug
							} )
							.done( function( slug ) {
								$slug.get( 0 ).textContent = slug;
							} );
						}
					} );

					$url.on( 'click.fee', function() {
						editor.focus();
					} );
				}
			} );
		}

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
				_wpnonce: wp.fee.nonces.post,
				post_ID: wp.fee.post.ID(),
				active_post_lock: wp.fee.lock
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
				wp.fee.post.post_title( postData.post_title );
				wp.fee.post.post_content( postData.content );
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
			if ( event.keyCode === 83 && ( event.metaKey || event.ctrlKey ) ) {
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
				post_id: wp.fee.post.ID(),
				lock: wp.fee.lock
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
					wp.fee.lock = received.new_lock;
				}
			}
		} )
		.on( 'heartbeat-send.fee-refresh-nonces', function( event, data ) {
			if ( checkNonces ) {
				data['wp-refresh-post-nonces'] = {
					post_id: wp.fee.post.ID(),
					post_nonce: wp.fee.nonces.post
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
		} )
		.on( 'after-autosave', function() {
			$autoSaveNotice && $autoSaveNotice.fadeOut( 'slow', function() {
				$autoSaveNotice.remove();
			} );
		} );

		$editLinks
		.on( 'click.fee', function( event ) {
			event.preventDefault();
			toggle();
		} );

		$categories.on( 'click.fee', function( event ) {
			if ( hidden ) {
				return;
			}

			event.preventDefault();
			$( '.fee-category-modal' ).modal( 'show' );
		} );

		$( '.fee-category-modal' ).on( 'hide.bs.modal', function() {
			wp.ajax.post( 'fee_categories', {
				nonce: wp.fee.nonces.categories,
				post_ID: wp.fee.post.ID(),
				separator: $categories.data( 'separator' ),
				parents: $categories.data( 'parents' ),
				post_category: wp.fee.post.post_category()
			} )
			.done( function( html ) {
				console.log( html );
				$categories.html( html );
			} );
		} );

		$postClass.find( 'a[rel="tag"]' ).on( 'click.fee', function( event ) {
			event.preventDefault();
		} );

		$postClass.find( 'time' ).add( $postClass.find( '.entry-date' ) ).on( 'click.fee', function( event ) {
			event.preventDefault();
		} );

		$postClass.find( 'a[rel="author"]' ).on( 'click.fee', function( event ) {
			event.preventDefault();
		} );

		$( 'a' ).not( 'a[href^="#"]' ).on( 'click.fee', function( event ) {
			var $this = $( this );

			if ( isDirty() && ! ( event.metaKey || event.ctrlKey ) ) {
				event.preventDefault();

				leaveMessage( function() {
					_off( $this.attr( 'href' ) );
				} );
			}
		} );

		$( '.fee-save' ).on( 'click.fee', function() {
			save();
		} );

		$( '.fee-publish' ).on( 'click.fee', function() {
			publish();
		} );

		if ( wp.fee.notices.autosave ) {
			$autoSaveNotice = addNotice( wp.fee.notices.autosave, 'error' );
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
			if ( hidden ) {
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

		// This part is copied from post.js.
		$( '.categorydiv' ).each( function() {
			var this_id = $(this).attr('id'), catAddBefore, catAddAfter, taxonomyParts, taxonomy, settingName;

			taxonomyParts = this_id.split('-');
			taxonomyParts.shift();
			taxonomy = taxonomyParts.join('-');
			settingName = taxonomy + '_tab';
			if ( taxonomy == 'category' )
				settingName = 'cats';

			// TODO: move to jQuery 1.3+, support for multiple hierarchical taxonomies, see wp-lists.js
			$('a', '#' + taxonomy + '-tabs').click( function(){
				var t = $(this).attr('href');
				$(this).parent().addClass('tabs').siblings('li').removeClass('tabs');
				$('#' + taxonomy + '-tabs').siblings('.tabs-panel').hide();
				$(t).show();
				if ( '#' + taxonomy + '-all' == t )
					deleteUserSetting( settingName );
				else
					setUserSetting( settingName, 'pop' );
				return false;
			});

			if ( getUserSetting( settingName ) )
				$('a[href="#' + taxonomy + '-pop"]', '#' + taxonomy + '-tabs').click();

			// Ajax Cat
			$( '#new' + taxonomy ).one( 'focus', function() { $( this ).val( '' ).removeClass( 'form-input-tip' ); } );

			$('#new' + taxonomy).keypress( function(event){
				if( 13 === event.keyCode ) {
					event.preventDefault();
					$('#' + taxonomy + '-add-submit').click();
				}
			});
			$('#' + taxonomy + '-add-submit').click( function(){ $('#new' + taxonomy).focus(); });

			catAddBefore = function( s ) {
				if ( !$('#new'+taxonomy).val() )
					return false;
				s.data += '&' + $( ':checked', '#'+taxonomy+'checklist' ).serialize();
				$( '#' + taxonomy + '-add-submit' ).prop( 'disabled', true );
				return s;
			};

			catAddAfter = function( r, s ) {
				var sup, drop = $('#new'+taxonomy+'_parent');

				$( '#' + taxonomy + '-add-submit' ).prop( 'disabled', false );
				if ( 'undefined' != s.parsed.responses[0] && (sup = s.parsed.responses[0].supplemental.newcat_parent) ) {
					drop.before(sup);
					drop.remove();
				}
			};

			$('#' + taxonomy + 'checklist').wpList({
				alt: '',
				response: taxonomy + '-ajax-response',
				addBefore: catAddBefore,
				addAfter: catAddAfter
			});

			$('#' + taxonomy + '-add-toggle').click( function() {
				$('#' + taxonomy + '-adder').toggleClass( 'wp-hidden-children' );
				$('a[href="#' + taxonomy + '-all"]', '#' + taxonomy + '-tabs').click();
				$('#new'+taxonomy).focus();
				return false;
			});

			$('#' + taxonomy + 'checklist, #' + taxonomy + 'checklist-pop').on( 'click', 'li.popular-category > label input[type="checkbox"]', function() {
				var t = $(this), c = t.is(':checked'), id = t.val();
				if ( id && t.parents('#taxonomy-'+taxonomy).length )
					$('#in-' + taxonomy + '-' + id + ', #in-popular-' + taxonomy + '-' + id).prop( 'checked', c );
			});
		} );

		_.extend( wp.fee, {
			on: on,
			off: off,
			toggle: toggle,
			isOn: isOn,
			isOff: isOff,
			isDirty: isDirty,
			save: save,
			publish: publish,
			addNotice: addNotice
		} );
	} );
} )( jQuery );
