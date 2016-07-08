var fee = ( function(
	data,
	$,
	api,
	heartbeat,
	tinymce
) {
	var hidden = true;

	var BaseModel = api.models[ data.post.type === 'page' ? 'Page' : 'Post' ];

	var AutosaveModel = BaseModel.extend( {
		isNew: function() {
			return true;
		},
		url: function() {
			return BaseModel.prototype.url.apply( this, arguments ) + '/autosave';
		}
	} );

	var Model = BaseModel.extend( {
		// Overwrite `sync` to send event before syncing.
		sync: function() {
			this.trigger( 'beforesync' );
			return BaseModel.prototype.sync.apply( this, arguments );
		},
		autosave: function() {
			if ( this.get( 'status' ) === 'draft' ) {
				this.save();
			} else {
				this.trigger( 'beforesync' );
				new AutosaveModel( _.clone( this.attributes ) ).save();
			}
		},
		toJSON: function() {
			var attributes = _.clone( this.attributes );

			// TODO: investigate why these can't be saved as they are.

			if ( ! attributes.slug ) {
				delete attributes.slug;
			}

			if ( ! attributes.date_gmt ) {
				delete attributes.date_gmt;
			}

			return attributes;
		}
	} );

	// Post model to manipulate.
	// Needs to represent the state on the server.
	var post = new Model();

	// Parse the data we got from the server and fill the model.
	post.set( post.parse( data.post ) );

	// Set heartbeat to run every minute.
	heartbeat.interval( 60 );

	$( function() {
		var VK = tinymce.util.VK,
			$window = $( window ),
			$document = $( document ),
			$body = $( document.body ),
			$postClass = $( '.fee-post' ),
			$editLinks = $( 'a[href="#edit"]' ),
			$hasPostThumbnail = $( '.has-post-thumbnail' ),
			$thumbnail = $( '.fee-thumbnail' ),
			$thumbnailWrap = $( '.fee-thumbnail-wrap' ),
			$thumbnailEdit = $( '.fee-edit-thumbnail' ).add( '.fee-insert-thumbnail' ),
			$thumbnailRemove = $( '.fee-remove-thumbnail' ),
			$content = $( '.fee-content' ),
			$contentOriginal = $( '.fee-content-original' ),
			$contentParents = $content.parents(),
			$titleTags, $titles, $title,
			editors = [],
			initializedEditors = 0,
			releaseLock = true;

		function on() {
			if ( ! hidden ) {
				return;
			}

			$( '#wp-admin-bar-edit' ).addClass( 'active' );
			$body.removeClass( 'fee-off' ).addClass( 'fee-on' );
			$hasPostThumbnail.addClass( 'has-post-thumbnail' );
			$postClass.parents().addClass('fee-post-parent');

			getEditors( function( editor ) {
				editor.show();
			} );

			if ( wp.autosave ) {
				wp.autosave.local.resume();
				wp.autosave.server.resume();
			}

			hidden = false;
		}

		function off() {
			if ( hidden || post.get( 'status' ) === 'auto-draft' ) {
				return;
			}

			if ( wp.autosave ) {
				wp.autosave.local.suspend();
				wp.autosave.server.suspend();
			}

			$( '#wp-admin-bar-edit' ).removeClass( 'active' );
			$body.removeClass( 'fee-on' ).addClass( 'fee-off' );
			if ( ! $thumbnail.find( 'img' ).length ) {
				$hasPostThumbnail.removeClass( 'has-post-thumbnail' );
			}

			getEditors( function( editor ) {
				editor.hide();
			} );

			$title.html( post.get( 'title' ).rendered );
			$titles.html( post.get( 'title' ).rendered );
			$contentOriginal.html( post.get( 'content' ).rendered );

			hidden = true;

			document.location.hash = '';
		}

		function getEditors( callback ) {
			_.each( editors, callback );
		}

		function registerEditor( editor ) {
			editors.push( editor );

			editor.on( 'init', function() {
				initializedEditors++;

				if ( initializedEditors === editors.length ) {
					$document.trigger( 'fee-editor-init' );
				}
			} );
		}

		function isDirty() {
			var dirty;

			getEditors( function( editor ) {
				dirty = dirty || editor.isDirty();
			} );

			return dirty;
		}

		tinymce.init( _.extend( data.tinymce, {
			setup: function( editor ) {
				// Used by the media library,
				window.wpActiveEditor = editor.id;

				editor.on( 'init', function() {
					editor.hide();
				} );

				registerEditor( editor );

				// Remove spaces from empty paragraphs.
				editor.on( 'BeforeSetContent', function( event ) {
					if ( event.content ) {
						event.content = event.content.replace( /<p>(?:&nbsp;|\s)+<\/p>/gi, '<p><br></p>' );
					}
				} );

				post.on( 'beforesync', function() {
					post.set( 'content', {
						raw: editor.getContent()
					} );

					editor.undoManager.add();
					editor.isNotDirty = true;
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

				$title.addClass( 'fee-title' );

				tinymce.init( {
					selector: '.fee-title',
					theme: 'fee',
					paste_as_text: true,
					plugins: 'paste',
					inline: true,
					placeholder: data.titlePlacholder,
					entity_encoding: 'raw',
					setup: function( editor ) {
						titleEditor = editor;

						editor.on( 'init', function() {
							editor.hide();
						} );

						registerEditor( editor );

						editor.on( 'keydown', function( event ) {
							if ( event.keyCode === 13 ) {
								event.preventDefault();
							}
						} );

						post.on( 'beforesync', function() {
							post.set( 'title', {
								raw: editor.getContent()
							} );

							editor.undoManager.add();
							editor.isNotDirty = true;
						} );
					}
				} );
			}
		}

		titleInit();

		$document.on( 'fee-editor-init.fee', function() {
			if ( $body.hasClass( 'fee-on' ) || document.location.hash === '#edit' ) {
				on();
			}

			if ( $body.hasClass( 'fee-off' ) && ! $thumbnail.find( 'img' ).length ) {
				$hasPostThumbnail.removeClass( 'has-post-thumbnail' );
			}
		} );

		$document.on( 'keydown.fee', function( event ) {
			if ( event.keyCode === 83 && VK.metaKeyPressed( event ) ) {
				event.preventDefault();
				post.save();
			}
		} );

		// $window.on( 'unload.fee-remove-lock', function( event ) {
		// 	if ( ! releaseLock ) {
		// 		return;
		// 	}

		// 	if ( event.target && event.target.nodeName !== '#document' ) {
		// 		return;
		// 	}

		// 	wp.ajax.post( 'wp-remove-post-lock', {
		// 		_wpnonce: data.nonces.post,
		// 		post_ID: post.get( 'id' ),
		// 		active_post_lock: data.lock
		// 	} );
		// } );

		// $document.on( 'heartbeat-send.fee-refresh-lock', function( event, data ) {
		// 	data['wp-refresh-post-lock'] = {
		// 		post_id: post.get( 'id' ),
		// 		lock: data.lock
		// 	};
		// } );

		// $document.on( 'heartbeat-tick.fee-refresh-lock', function( event, data ) {
		// 	var received = data['wp-refresh-post-lock'],
		// 		wrap, avatar;

		// 	if ( received ) {
		// 		if ( received.lock_error ) {
		// 			wrap = $( '#post-lock-dialog' );

		// 			if ( wrap.length && ! wrap.is( ':visible' ) ) {
		// 				if ( wp.autosave ) {
		// 					$document.one( 'heartbeat-tick', function() {
		// 						wp.autosave.server.suspend();
		// 						wrap.removeClass( 'saving' ).addClass( 'saved' );
		// 					} );

		// 					wrap.addClass( 'saving' );
		// 					wp.autosave.server.triggerSave();
		// 				}

		// 				if ( received.lock_error.avatar_src ) {
		// 					avatar = $( '<img class="avatar avatar-64 photo" width="64" height="64" />' ).attr( 'src', received.lock_error.avatar_src.replace( /&amp;/g, '&' ) );
		// 					wrap.find( 'div.post-locked-avatar' ).empty().append( avatar );
		// 				}

		// 				wrap.show().find( '.currently-editing' ).text( received.lock_error.text );
		// 				wrap.find( '.wp-tab-first' ).focus();
		// 			}
		// 		} else if ( received.new_lock ) {
		// 			data.lock = received.new_lock;
		// 		}
		// 	}
		// } );

		$document.on( 'heartbeat-send.fee-refresh-nonces', function() {
			if ( ! hidden && isDirty() ) {
				post.autosave();
			}
		} );

		$document.on( 'heartbeat-tick.fee-refresh-nonces', function( event, data ) {
			if ( data.fee_nonces ) {
				window.wpApiSettings.nonce = data.fee_nonces.api;
				window.heartbeatSettings.nonce = data.fee_nonces.heartbeat;
			}
		} );

		$editLinks.on( 'click.fee', function( event ) {
			if ( hidden ) {
				on();
			} else {
				off();
				event.preventDefault();
			}
		} );

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
	} );

	return {
		post: post
	};
} )(
	window.feeData,
	window.jQuery,
	window.wp.api,
	window.wp.heartbeat,
	window.tinymce
);
