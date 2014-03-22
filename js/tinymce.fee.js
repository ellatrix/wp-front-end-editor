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

} );
