/* global tinymce */

tinymce.PluginManager.add( 'insert', function( editor ) {
	'use strict';

	var insert, insertModal,
		DOM = tinymce.DOM;

	editor.on( 'keyup mouseup NodeChange', function( event ) {
		var node = event.element || editor.selection.getNode();

		insert.hide();

		node = node.nodeName === 'BR' ? node.parentNode : node;

		if ( node.nodeName === 'P' && editor.dom.isEmpty( node ) && ( ! editor.plugins.wpview || ! editor.plugins.wpview.getView( node ) ) ) {
			insert.show( node );
		}
	} );

	editor.on( 'keydown blur hide deactivate', function() {
		insert.hide();
	} );

	DOM.bind( document, 'keydown', function() {
		if ( insert._visible && ! insertModal._visible ) {
			insert.hide();
			editor.focus();
		}
	} );

	function getParent( node ) {
		var body = editor.getBody();

		if ( node === body ) {
			return node.firstChild;
		}

		while ( node ) {
			if ( node.parentNode === body ) {
				return node;
			}

			node = node.parentNode;
		}

		return false;
	}

	editor.on( 'PreInit', function() {
		var currentNode;

		insert = tinymce.ui.Factory.create( {
			type: 'panel',
			layout: 'stack',
			classes: 'insert',
			ariaRoot: true,
			ariaRemember: true,
			html: '<span class="dashicons dashicons-plus-alt"></span> Add a block',
			onclick: function() {
				if ( insertModal._visible ) {
					insertModal.hide();
				} else {
					insertModal.setPos( currentNode );
				}
			}
		} );

		insertModal = tinymce.ui.Factory.create( {
			type: 'panel',
			layout: 'flow',
			classes: 'insert-modal',
			ariaRoot: true,
			ariaRemember: true,
			items: editor.toolbarItems( editor.settings.blocks, true )
		} );

		insert.on( 'show', function() {
			this.setPos();
		} );

		insert.on( 'hide', function() {
			insertModal.hide();
		} );

		DOM.bind( window, 'resize', function() {
			insert.hide();
			insertModal.hide();
		} );

		insert.setPos = function( node ) {
			node = node || editor.selection.getNode();
			node = node.nodeName === 'BR' ? node.parentNode : node;

			var insertEl = this.getEl(),
				cursor = editor.dom.getPos(node ),
				diff = ( node.clientHeight - insertEl.clientHeight ) / 2;

			DOM.setStyles( insertEl, {
				'left': cursor.x,
				'top': cursor.y + diff,
				'color': editor.dom.getStyle( node, 'color', true )
			} );

			return this;
		};

		insert.renderTo( document.body ).hide();

		insertModal.on( 'hide', function() {
			editor.dom.remove( editor.dom.select( '.mce-insert-placeholder' ) );
			DOM.removeClass( insert.getEl(), 'open' );
		} );

		insertModal.setPos = function( node ) {
			node = node || editor.selection.getNode();
			node = node.nodeName === 'BR' ? node.parentNode : node;

			var dom = editor.dom,
				parent = getParent( node ),
				insertEl = this.getEl(),
				body = editor.dom.getPos( editor.getBody() ),
				placeholder;

			DOM.addClass( insert.getEl(), 'open' );

			placeholder = dom.create( 'p', {
				'data-mce-bogus': 'all',
				'class': 'mce-insert-placeholder',
				'style': 'height: 0px;'
			}, '\u00a0' );

			dom.insertAfter( placeholder, parent );

			DOM.setStyles( insertEl, {
				'left': body.x,
				'top': editor.dom.getPos( placeholder ).y,
				'width': editor.getBody().clientWidth,
				'opacity': 0
			} );

			insertModal.show();

			editor.dom.setStyles( placeholder, {
				'height': insertEl.clientHeight
			} );

			jQuery( placeholder )
				.hide()
				.height( insertEl.clientHeight )
				.slideDown( 'fast', function() {
					// $( modal ).css( 'opacity', '' ).fadeIn();
					DOM.setStyles( insertEl, {
						'opacity': 1
					} );
				} );

			return this;
		};

		insertModal.renderTo( document.body ).hide();
	} );

	editor.addButton( 'wp_media', {
		tooltip: 'Media',
		icon: 'dashicons-admin-media',
		onclick: function() {
			wp.media.editor.open( editor.id );
		}
	} );
} );
