/* global tinymce */

tinymce.PluginManager.add( 'toolbar', function( editor ) {

	var each = tinymce.each,
		dom = tinymce.DOM,
		toolbar;

	editor.on( 'keyup mouseup nodechange', function() {
		if ( editor.selection.isCollapsed() ) {
			toolbar.hide();
			return;
		}

		setTimeout( function() {
			var element = editor.selection.getNode();

			if ( ! editor.selection.isCollapsed() &&
					editor.selection.getContent().replace( /<[^>]+>/g, '' ).trim() &&
					element.nodeName !== 'IMG' &&
					element.nodeName !== 'HR' &&
					element.id !== 'wp-title' &&
					( ! editor.plugins.wpview || ! editor.plugins.wpview.getView( element ) ) ) {
				if ( toolbar._visible ) {
					toolbar.setPos();
				} else {
					toolbar.show();
				}
			} else {
				toolbar.hide();
			}
		}, 50 );
	} );

	editor.on( 'blur hide', function() {
		toolbar.hide();
	} );

	function getParent( node, nodeName ) {
		while ( node ) {
			if ( node.nodeName === nodeName ) {
				return node;
			}

			node = node.parentNode;
		}

		return false;
	}

	editor.on( 'PreInit', function() {
		var inlineToolbar = editor.settings.inlineToolbar || 'bold italic strikethrough link unlink blockquote h2 h3',
			buttons = [];

		each( inlineToolbar.split( /[ ,]/ ), function( name ) {
			var item = editor.buttons[name],
				button;
			if ( item ) {
				item.type = item.type || 'button';
				item.tooltip = false;

				if ( name === 'link' ) {
					item.onPostRender = function() {
						var self = this;

						editor.on( 'NodeChange', function( event ) {
							self.active( getParent( event.element, 'A' ) );
						} );
					};
				} else if ( name === 'unlink' ) {
					item.onPostRender = function() {
						var self = this;

						editor.on( 'NodeChange', function( event ) {
							self.disabled( event.element.nodeName !== 'A' && editor.selection.getContent().indexOf( '<a' ) === -1 );
						} );
					};
				}

				button = tinymce.ui.Factory.create( item );
				buttons.push( button );
			}
		} );

		toolbar = tinymce.ui.Factory.create( {
			type: 'panel',
			layout: 'stack',
			classes: 'inline-toolbar-grp popover',
			ariaRoot: true,
			ariaRemember: true,
			items: {
				type: 'toolbar',
				layout: 'flow',
				items: {
					type: 'buttongroup',
					items: buttons
				}
			}
		} );

		toolbar.on( 'show', function() {
			this.setPos();
		} );

		toolbar.on( 'hide', function() {
			dom.removeClass( this.getEl(), 'mce-inline-toolbar-active' );
		} );

		dom.bind( window, 'resize', function() {
			toolbar.hide();
		} );

		toolbar.setPos = function() {
			var toolbarEl = this.getEl(),
				boundary = editor.selection.getRng().getBoundingClientRect(),
				boundaryMiddle = ( boundary.left + boundary.right ) / 2,
				toolbarHalf = toolbarEl.offsetWidth / 2,
				margin = parseInt( dom.getStyle( toolbarEl, 'margin-bottom', true ), 10),
				top, left;

			if ( boundary.top < toolbarEl.offsetHeight ) {
				dom.addClass( toolbarEl, 'mce-inline-toolbar-arrow-up' );
				dom.removeClass( toolbarEl, 'mce-inline-toolbar-arrow-down' );
				top = boundary.bottom + margin;
			} else {
				dom.addClass( toolbarEl, 'mce-inline-toolbar-arrow-down' );
				dom.removeClass( toolbarEl, 'mce-inline-toolbar-arrow-up' );
				top = boundary.top - toolbarEl.offsetHeight - margin;
			}

			left = boundaryMiddle - toolbarHalf;

			dom.setStyles( toolbarEl, { 'left': left, 'top': top + window.pageYOffset } );

			setTimeout( function() {
				dom.addClass( toolbarEl, 'mce-inline-toolbar-active' );
			}, 100 );

			return this;
		};

		toolbar.renderTo( document.body ).hide();

		editor.inlineToolbar = toolbar;
	} );

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
} );
