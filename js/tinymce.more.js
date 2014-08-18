/* global tinymce */
tinymce.PluginManager.add( 'wpmore', function( editor ) {
	editor.addCommand( 'WP_More', function( tag ) {
		var parent, html,
			dom = editor.dom,
			node = editor.selection.getNode(),
			body = editor.getBody();

		tag = tag || 'more';
		html = '<!--' + tag + '-->';

		// Most common case
		if ( node === body || ( node.nodeName === 'P' && node.parentNode === body ) ) {
			editor.insertContent( html );
			return;
		}

		// Get the top level parent node
		parent = dom.getParent( node, function( found ) {
			if ( found.parentNode && found.parentNode === body ) {
				return true;
			}

			return false;
		}, editor.getBody() );

		if ( parent ) {
			if ( parent.nodeName === 'P' ) {
				parent.appendChild( dom.create( 'p', null, html ).firstChild );
			} else {
				dom.insertAfter( dom.create( 'p', null, html ), parent );
			}

			editor.nodeChanged();
		}
	});

	editor.addCommand( 'WP_Page', function() {
		editor.execCommand( 'WP_More', 'nextpage' );
	});

	editor.addButton( 'wp_more', {
		tooltip: 'Read More',
		onclick: function() {
			editor.execCommand( 'WP_More', 'more' );
		}
	});

	editor.addButton( 'wp_page', {
		tooltip: 'Page Break',
		onclick: function() {
			editor.execCommand( 'WP_More', 'nextpage' );
		}
	});
} );
