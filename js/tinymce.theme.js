/* global tinymce */

tinymce.ThemeManager.add( 'fee', function( editor ) {
	var self = this,
		settings = editor.settings,
		Factory = tinymce.ui.Factory,
		each = tinymce.each,
		DOM = tinymce.DOM,
		adminBarHeight = 32;

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

	function toolbarItems( array, block ) {
		var items = [],
			buttonGroup;

		if ( ! array ) {
			return;
		}

		each( array, function( item ) {
			var itemName;

			function bindSelectorChanged() {
				var selection = editor.selection;

				if ( itemName === 'bullist' ) {
					selection.selectorChanged( 'ul > li', function( state, args ) {
						var nodeName,
							i = args.parents.length;

						while ( i-- ) {
							nodeName = args.parents[ i ].nodeName;

							if ( nodeName === 'OL' || nodeName === 'UL' ) {
								break;
							}
						}

						item.active( state && nodeName === 'UL' );
					} );
				}

				if ( itemName === 'numlist' ) {
					selection.selectorChanged( 'ol > li', function(state, args) {
						var nodeName,
							i = args.parents.length;

						while ( i-- ) {
							nodeName = args.parents[ i ].nodeName;

							if ( nodeName === 'OL' || nodeName === 'UL' ) {
								break;
							}
						}

						item.active( state && nodeName === 'OL' );
					} );
				}

				if ( item.settings.stateSelector ) {
					selection.selectorChanged( item.settings.stateSelector, function( state ) {
						item.active( state );
					}, true );
				}

				if ( item.settings.disabledStateSelector ) {
					selection.selectorChanged( item.settings.disabledStateSelector, function( state ) {
						item.disabled( state );
					} );
				}
			}

			if ( item === '|' ) {
				buttonGroup = null;
			} else {
				if ( Factory.has( item ) ) {
					item = {
						type: item
					};

					if ( settings.toolbar_items_size ) {
						item.size = settings.toolbar_items_size;
					}

					items.push( item );
					buttonGroup = null;
				} else {
					if ( ! buttonGroup || block ) {
						buttonGroup = {
							type: 'buttongroup',
							items: []
						};
						items.push( buttonGroup );
					}

					if ( editor.buttons[ item ] ) {
						itemName = item;
						item = editor.buttons[ itemName ];

						if ( typeof( item ) === 'function' ) {
							item = item();
						}

						if ( item.icon && item.icon.indexOf( 'dashicons' ) !== -1 ) {
							item.icon = 'dashicon ' + item.icon;
						}

						if ( block ) {
							item.text = item.tooltip;
							item.tooltip = false;
						}

						item.type = item.type || 'button';

						if ( settings.toolbar_items_size ) {
							item.size = settings.toolbar_items_size;
						}

						if ( itemName === 'link' ) {
							item.onPostRender = function() {
								var self = this;

								editor.on( 'NodeChange', function( event ) {
									self.active( getParent( event.element, 'A' ) );
								} );
							};
						} else if ( itemName === 'unlink' ) {
							item.onPostRender = function() {
								var self = this;

								editor.on( 'NodeChange', function( event ) {
									var disabled = event.element.nodeName !== 'A' && editor.selection.getContent().indexOf( '<a' ) === -1;
									self.disabled( disabled );
									DOM.setAttrib( self.getEl(), 'tabindex', disabled ? '0' : '-1' );
								} );
							};

							item.onclick = function() {
								if ( editor.selection.getContent().indexOf( '<a' ) === -1 ) {
									editor.selection.select( editor.selection.getNode() );
								}

								editor.execCommand( 'unlink' );
							};
						}

						item = Factory.create( item );
						buttonGroup.items.push( item );

						if ( editor.initialized ) {
							bindSelectorChanged();
						} else {
							editor.on( 'init', bindSelectorChanged );
						}
					}
				}
			}
		});

		return items;
	}

	function createToolbar( items ) {
		return Factory.create( {
			type: 'panel',
			layout: 'stack',
			classes: 'toolbar-grp',
			ariaRoot: true,
			ariaRemember: true,
			items: [
				{
					type: 'toolbar',
					layout: 'flow',
					items: toolbarItems( items )
				}
			]
		} );
	}

	editor.toolbarItems = toolbarItems;

	self.renderUI = function() {
		var panel, toolbars = {}, hasPlaceholder;

		settings.content_editable = true;

		function isEmpty() {
			return editor.getContent( { format: 'raw' } ).replace( /(?:<p[^>]*>)?(?:<br[^>]*>)?(?:<\/p>)?/, '' ) === '';
		}

		editor.on( 'nodeChange', function() {
			DOM.addClass( editor.getBody(), 'mce-edit-focus' );
		} );

		editor.on( 'deactivate blur hide', function() {
			DOM.removeClass( editor.getBody(), 'mce-edit-focus' );
		} );

		editor.on( 'remove', function() {
			panel && panel.remove();
			panel = null;
		} );

		if ( settings.placeholder ) {
			editor.on( 'blur LoadContent deactivate', function() {
				if ( isEmpty() ) {
					editor.setContent( settings.placeholder );
					hasPlaceholder = true;
					DOM.addClass( editor.getBody(), 'mce-placeholder' );
				}
			} );

			editor.on( 'focus activate', function() {
				if ( hasPlaceholder ) {
					editor.setContent( '' );
				}
			} );

			editor.on( 'SetContent', function( event ) {
				if ( hasPlaceholder && ! event.load ) {
					hasPlaceholder = false;
					DOM.removeClass( editor.getBody(), 'mce-placeholder' );
				}
			} );

			editor.on( 'PostProcess', function( event ) {
				if ( hasPlaceholder && event.content ) {
					event.content = '';
				}
			} );

			editor.on( 'BeforeAddUndo', function( event ) {
				if ( hasPlaceholder ) {
					event.preventDefault();
				}
			} );
		}

		if ( ! settings.toolbar || ! settings.toolbar.length || panel ) {
			return {};
		}

		toolbars.normal = createToolbar( settings.toolbar );
		toolbars.img = createToolbar( [ 'imgalignleft', 'imgaligncenter', 'imgalignright', 'imgalignnone', 'edit', 'remove' ] );

		panel = self.panel = Factory.create( {
			type: 'floatpanel',
			role: 'application',
			classes: 'tinymce tinymce-inline',
			layout: 'stack',
			autohide: true,
			items: [
				toolbars.normal,
				toolbars.img
			]
		} );

		panel.reposition = function( name ) {
			var toolbarEl = this.getEl(),
				boundary = editor.selection.getRng().getBoundingClientRect(),
				boundaryMiddle = ( boundary.left + boundary.right ) / 2,
				windowWidth = window.innerWidth,
				toolbarWidth, toolbarHalf,
				margin = parseInt( DOM.getStyle( toolbarEl, 'margin-bottom', true ), 10),
				top, left, className;

			toolbarEl.className = ( ' ' + toolbarEl.className + ' ' ).replace( /\smce-arrow-\S+\s/g, ' ' ).slice( 1, -1 );

			name = name || 'normal';

			if ( ! toolbars[ name ]._visible ) {
				each( toolbars, function( toolbar ) {
					toolbar.hide();
				} );

				toolbars[ name ].show();
			}

			toolbarWidth = toolbarEl.offsetWidth;
			toolbarHalf = toolbarWidth / 2;

			if ( boundary.top < toolbarEl.offsetHeight + adminBarHeight ) {
				className = ' mce-arrow-up';
				top = boundary.bottom + margin;
			} else {
				className = ' mce-arrow-down';
				top = boundary.top - toolbarEl.offsetHeight - margin;
			}

			left = boundaryMiddle - toolbarHalf;

			if ( toolbarWidth >= windowWidth ) {
				className += ' mce-arrow-full';
				left = 0;
			} else if ( ( left < 0 && boundary.left + toolbarWidth > windowWidth ) || ( left + toolbarWidth > windowWidth && boundary.right - toolbarWidth < 0 ) ) {
				left = ( windowWidth - toolbarWidth ) / 2;
			} else if ( left < 0 ) {
				className += ' mce-arrow-left';
				left = boundary.left;
			} else if ( left + toolbarWidth > windowWidth ) {
				className += ' mce-arrow-right';
				left = boundary.right - toolbarWidth;
			}

			toolbarEl.className += className;

			DOM.setStyles( toolbarEl, { 'left': left, 'top': top + window.pageYOffset } );

			return this;
		};

		panel.on( 'show', function() {
			var self = this;

			setTimeout( function() {
				self._visible && DOM.addClass( self.getEl(), 'mce-inline-toolbar-active' );
			}, 100 );
		} );

		panel.on( 'hide', function() {
			DOM.removeClass( this.getEl(), 'mce-inline-toolbar-active' );
		} );

		panel.on( 'cancel', function() {
			editor.focus();
		} );

		DOM.bind( window, 'resize', function() {
			panel.hide();
		} );

		editor.on( 'keyup mouseup nodechange', function() {
			if ( editor.selection.isCollapsed() ) {
				panel.hide();
				return;
			}

			setTimeout( function() {
				var element = editor.selection.getNode(),
					content;

				if ( ! editor.selection.isCollapsed() &&
						( content = editor.selection.getContent() ) &&
						( content.replace( /<[^>]+>/g, '' ).trim() || content.indexOf( '<' ) === 0 ) &&
						element.nodeName !== 'HR' &&
						( ! editor.plugins.wpview || ! editor.plugins.wpview.getView( element ) ) ) {
					panel.show().reposition( element.nodeName === 'IMG' ? 'img' : 'normal' );
				} else {
					panel.hide();
				}
			}, 100 );
		} );

		editor.shortcuts.add( 'Alt+F10', '', function() {
			var item = panel.find( 'toolbar' )[0];

			item && item.focus( true );
		} );

		panel.renderTo( document.body ).reflow().hide();

		each( toolbars, function( toolbar ) {
			toolbar.hide();
		} );

		return {};
	};
} );
