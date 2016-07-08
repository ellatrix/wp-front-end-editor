var fee = ( function(
	data,
	$,
	api,
	heartbeat,
	tinymce,
	_
) {
	var hidden = data.post.status !== 'auto-draft';

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

	var $window = $( window );
	var $document = $( document );
	var $body = $( document.body );
	var $post = $( '.fee-post' );
	var $content = $( '.fee-content' );
	var $titles = findTitles();
	var $title = findTitle( $titles, $content );

	$( function() {
		var $links = $( 'a[href="' + data.editURL + '"]' ),
			$hasPostThumbnail = $( '.has-post-thumbnail' ),
			$thumbnail = $( '.fee-thumbnail' ),
			$thumbnailWrap = $( '.fee-thumbnail-wrap' ),
			$thumbnailEdit = $( '.fee-edit-thumbnail' ).add( '.fee-insert-thumbnail' ),
			$thumbnailRemove = $( '.fee-remove-thumbnail' ),
			$contentOriginal = $( '.fee-content-original' ),
			editors = [],
			initializedEditors = 0,
			releaseLock = true;

		function on() {
			if ( ! hidden ) {
				return;
			}

			$body.removeClass( 'fee-off' ).addClass( 'fee-on' );
			$hasPostThumbnail.addClass( 'has-post-thumbnail' );

			_.each( editors, function( editor ) {
				editor.show();
			} );

			hidden = false;
		}

		function off() {
			if ( hidden || post.get( 'status' ) === 'auto-draft' ) {
				return;
			}

			$body.removeClass( 'fee-on' ).addClass( 'fee-off' );
			if ( ! $thumbnail.find( 'img' ).length ) {
				$hasPostThumbnail.removeClass( 'has-post-thumbnail' );
			}

			_.each( editors, function( editor ) {
				editor.hide();
			} );

			$title.html( post.get( 'title' ).rendered );
			$titles.html( post.get( 'title' ).rendered );
			$contentOriginal.html( post.get( 'content' ).rendered );

			hidden = true;
		}

		function isDirty() {
			var dirty;

			_.each( editors, function( editor ) {
				dirty = dirty || editor.isDirty();
			} );

			return dirty;
		}

		if ( ! hidden ) {
			$body.removeClass( 'fee-off' ).addClass( 'fee-on' );
		} else if ( ! $thumbnail.find( 'img' ).length ) {
			$hasPostThumbnail.removeClass( 'has-post-thumbnail' );
		}

		tinymce.init( _.extend( data.tinymce, {
			setup: function( editor ) {
				// Used by the media library,
				window.wpActiveEditor = editor.id;

				editor.on( 'init', function() {
					if ( hidden ) {
						editor.hide();
					}
				} );

				editors.push( editor );

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
					if ( hidden ) {
						editor.hide();
					}
				} );

				editors.push( editor );

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

		$document.on( 'keydown.fee', function( event ) {
			if ( event.keyCode === 83 && tinymce.util.VK.metaKeyPressed( event ) ) {
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

		$links.on( 'click.fee-link', function( event ) {
			event.preventDefault();

			if ( hidden ) {
				on();
			} else {
				off();
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

	function findTitles() {
		var $br = $( 'br.fee-title' );
		var $titles = $br.parent();

		$br.remove();

		return $titles;
	}

	function findTitle( $titles, $content ) {
		var title = false;
		var $parents = $content.parents();
		var index;

		$titles.each( function() {
			var self = this;

			$( this ).parents().each( function() {
				if ( index < ( index = $.inArray( this, $parents ) ) ) {
					title = self;
					return false;
				}
			} );
		} );

		return $( title ).addClass( 'fee-title' );
	}

	return {
		post: post
	};
} )(
	window.feeData,
	window.jQuery,
	window.wp.api,
	window.wp.heartbeat,
	window.tinymce,
	window._
);
