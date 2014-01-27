/* global tinymce */

tinymce
	.PluginManager
	.add( 'wpfeelink', function( editor ) {

		var wpfeelink = function() {

			var text = editor
					.selection
					.getContent( {
						format: 'text'
					} ),
				selectedNode = editor
					.selection
					.getNode(),
				oldHref = editor
					.dom
					.getParent( selectedNode, 'a[href]' ),
				href = window
					.prompt( 'Enter a link:', oldHref );

			if ( ! href ) {
				if ( href === '' ) {
					editor
						.execCommand( 'unlink' );
				}
				return;
			}

			if ( ! href.match( /^(https?:)\/\/?/ig ) ) {
				href = 'http://' + href;
			}

			if ( ! text ) {
				if ( oldHref ) {
					editor
						.dom
						.setAttribs( oldHref, {
							href: href
						} );
				} else {
					editor
						.insertContent( editor.dom.createHTML( 'a', {
							href: href
						}, href ) );
				}
			} else {
				editor
					.execCommand( 'mceInsertLink', false, {
						href: href
					} );
			}

		};

		editor
			.addButton( 'link', {
				icon: 'link',
				tooltip: 'Insert/edit link',
				shortcut: 'Ctrl+K',
				onclick: wpfeelink,
				stateSelector: 'a[href]'
			} );

		editor
			.addShortcut( 'Ctrl+K', '', wpfeelink );

	} );
