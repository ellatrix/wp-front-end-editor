/* global tinymce */

tinymce.ThemeManager.add( 'fee', function( editor ) {
	var self = this,
		settings = editor.settings,
		Factory = tinymce.ui.Factory,
		each = tinymce.each,
		DOM = tinymce.DOM,
		adminBarHeight = 32,
		focus;

	function getParent( node, nodeName ) {
		while ( node ) {
			if ( node.nodeName === nodeName ) {
				return node;
			}

			node = node.parentNode;
		}

		return false;
	}

	each( {
		H1: 'Heading 1',
		H2: 'Heading 2',
		H3: 'Heading 3',
		H4: 'Heading 4',
		H5: 'Heading 5',
		H6: 'Heading 6',
		Pre: 'Preformatted'
	}, function( text, name ) {
		var nameLower = name.toLowerCase();

		editor.addButton( nameLower, {
			tooltip: text,
			text: name,
			onclick: function() {
				editor.formatter.toggle( nameLower );
			},
			onPostRender: function() {
				var self = this;

				editor.on( 'nodeChange', function( event ) {
					each( event.parents, function( node ) {
						self.active( !! editor.formatter.matchNode( node, nameLower ) );
					} );
				} );
			}
		} );
	} );

	self.renderUI = function() {
		var hasPlaceholder;

		settings.content_editable = true;

		function isEmpty() {
			return editor.getContent( { format: 'raw' } ).replace( /(?:<p[^>]*>)?(?:<br[^>]*>)?(?:<\/p>)?/, '' ) === '';
		}

		editor.on( 'activate focus', function() {
			focus = true;
			DOM.addClass( editor.getBody(), 'mce-edit-focus' );
		} );

		editor.on( 'deactivate blur hide', function() {
			focus = false;
			DOM.removeClass( editor.getBody(), 'mce-edit-focus' );
		} );

		if ( settings.placeholder ) {
			editor.on( 'init', function() {
				editor.getBody().setAttribute( 'data-placeholder', settings.placeholder );
			} );

			editor.on( 'blur setcontent loadcontent', function() {
				if ( isEmpty() ) {
					editor.getBody().setAttribute( 'data-empty', '' );
				} else {
					editor.getBody().removeAttribute( 'data-empty' );
				}
			} );
		}


		editor.on( 'preinit', function() {
			if ( editor.wp && editor.wp._createToolbar ) {
				var toolbar = editor.wp._createToolbar( settings.toolbar );

				editor.on( 'wptoolbar', function( event ) {
					var element = event.element;
					var range = editor.selection.getRng();
					var content = editor.selection.getContent();

					// No collapsed selection.
					if ( range.collapsed ) {
						return;
					}

					// No non editable elements.
					if (
						element.getAttribute( 'contenteditable' ) === 'false' ||
						element.getAttribute( 'data-mce-bogus' ) === 'all'
					) {
						return;
					}

					// No images.
					if ( element.nodeName === 'IMG' ) {
						return;
					}

					// No horizontal rules.
					if ( element.nodeName === 'HR' ) {
						return;
					}

					// No empty selection.
					if ( ! content.replace( /<[^>]+>/g, '' ).replace( /(?:\s|&nbsp;)/g, '' ) ) {
						return;
					}

					// Selection needs to be contained in one element.
					if ( range.startContainer === range.endContainer || (
						range.startContainer.nodeType === 3 &&
						range.startContainer.parentNode === range.endContainer
					) || (
						range.endContainer.nodeType === 3 &&
						range.endContainer.parentNode === range.startContainer
					) ) {
						event.toolbar = toolbar;
						event.selection = range;
					}
				} );
			}
		} );

		return {};
	};
} );
