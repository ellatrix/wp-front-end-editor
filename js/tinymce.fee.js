/* global tinymce */
tinymce.PluginManager.add( 'wpkitchensink', function( editor ) {

	editor.addButton( 'kitchensink', {
		title: 'More\u2026',
		onclick: function( event ) {
			var target = event.target || event.srcElement,
				toolbar = jQuery( target ).parents( '.mce-toolbar' );
			toolbar.hide();
			if ( toolbar.next().length ) {
				toolbar.next().show();
			} else {
				toolbar.parent().children().first().show();
			}
		}
	} );
	editor.on( 'init', function() {
		editor.focus();
		jQuery( '.mce-i-media' ).parent()
			.data( 'editor', 'fee-edit-content-' + wp.fee.post.id() )
			.addClass( 'insert-media add_media' );
		jQuery(document).triggerHandler( 'tinymce-editor-init', [editor] );
		/*jQuery( 'body' )
			.append( '<div id="wp-fee-insert-block"><div class="dashicons dashicons-plus"></div> Add a content block</div>' )
			.append( '<div id="wp-fee-insert-list">' +
				'<div class="insert-media add_media" date-editor="fee-edit-content-' + wp.fee.post.id() + '"><div class="dashicons dashicons-format-image"></div> Image</div>' +
				'<div class="insert-media add_media" date-editor="fee-edit-content-' + wp.fee.post.id() + '"><div class="dashicons dashicons-format-gallery"></div> Gallery</div>' +
				'<div class="insert-media add_media" date-editor="fee-edit-content-' + wp.fee.post.id() + '"><div class="dashicons dashicons-format-audio"></div> Audio</div>' +
				'<div class="insert-media add_media" date-editor="fee-edit-content-' + wp.fee.post.id() + '"><div class="dashicons dashicons-format-video"></div> Video</div>' +
				'<div class="insert-media add_media" date-editor="fee-edit-content-' + wp.fee.post.id() + '"><div class="dashicons dashicons-location-alt"></div> Map</div>' +
			'</div>' );
		jQuery( '.mce-content-body' ).sortable( {
			handle: '.wp-fee-block-handle',
			placeholder: 'wp-fee-block-placeholder'
		} );*/
	} );

	editor.addButton( 'media', {
		title: 'Add Media'
	} );

	editor
		.on( 'focus', function() {
			jQuery( 'p.wp-fee-content-placeholder' ).hide();
		} )
		.on( 'blur', function() {
			var contentOnBlur = editor.getContent()
					.replace( /\s/g, '' )
					.replace( /&nbsp;/g, '' )
					.replace( /<br>/g, '' )
					.replace( /<p><\/p>/g, '' );
			if ( ! contentOnBlur ) {
				jQuery( 'p.wp-fee-content-placeholder' ).show();
			}
		} );

	editor.on( 'SetContent', function( event ) {
		var body, padNode;
		if ( event.load || ! event.set ) {
			body = editor.getBody();
			if ( editor.dom.hasClass( body.firstChild, 'wp-fee-shortcode-container' ) ) {
				padNode = wp.fee.createPadNode( editor );
				body.insertBefore( padNode, body.firstChild );
			}
			if ( editor.dom.hasClass( body.lastChild, 'wp-fee-shortcode-container' ) ) {
				padNode = wp.fee.createPadNode( editor );
				body.appendChild( padNode, body.lastChild );
			}
		}
	} );

	editor.on( 'PreProcess', function( event ) {
		var dom = editor.dom;
		tinymce.each( dom.select( 'p[data-wpview-pad]', event.node ), function( node ) {
			if ( dom.isEmpty( node ) ) {
				dom.remove( node );
			} else {
				dom.setAttrib( node, 'data-wpview-pad', null );
			}
		});
	} );
/*
	editor.on( 'keydown', function( event ) {
		jQuery( '#wp-fee-insert-block' ).hide();
	} );

	editor.on( 'keyup click', function( event ) {
		if ( event.type === 'click' && ! jQuery( event.target ).parents( '.mce-content-body' ).length ) {
			return;
		}
		var dom = editor.dom,
			current = editor.selection.getNode(),
			insert = jQuery( '#wp-fee-insert-block' ),
			list = jQuery( '#wp-fee-insert-list' ),
			parent = dom.getParent( current, '.mce-content-body > *' ),
			empty = dom.isEmpty( current ),
			offset;
		jQuery( '.wp-fee-block-handle' ).remove();
		if ( ! empty ) {
			jQuery( parent ).prepend( '<div class="wp-fee-block-handle dashicons dashicons-menu" contenteditable="false"></div>' );
		}
		if ( empty && current.nodeName !== 'IMG' ) {
//			list.hide();
			current = jQuery( current ),
			offset = current.offset();
			insert
				.css( {
					top: offset.top - 2,
					left: offset.left + 10
				} )
				.show()
				.on( 'click', function( event ) {
					event.stopPropagation();
					list
						.css( {
							top: offset.top - 40,
							left: offset.left + 46
						} )
						.show()
						.on( 'click', function( event ) {
							insert.hide();
							list.hide();
						} );;
				} );
		} else {
			insert.hide();
			list.hide();
		}
	} );

	editor.on( 'keydown', function( event ) {
		jQuery( '.wp-fee-block-handle' ).remove();
	} );

	editor.on( 'PostProcess', function( e ) {
		if ( e.get ) {
			e.content = e.content.replace( / class="ui-sortable"/g, '' );
		}
	});
*/
} );
