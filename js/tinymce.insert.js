/* global tinymce */

tinymce.PluginManager.add( 'insert', function( editor ) {
	'use strict';

	var insert,
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
		if ( insert._visible ) {
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
		insert = tinymce.ui.Factory.create( {
			type: 'panel',
			layout: 'stack',
			classes: 'insert',
			ariaRoot: true,
			ariaRemember: true,
			html: '<span class="dashicons dashicons-plus-alt"></span> Add Media',
			onclick: function() {
				wp.media.editor.open( editor.id );
			}
		} );

		insert.on( 'show', function() {
			this.setPos();
		} );

		DOM.bind( window, 'resize', function() {
			insert.hide();
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
	} );
} );
