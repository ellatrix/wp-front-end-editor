/* global tinymce */

tinymce.PluginManager.add( 'feeMarkDown', function( editor ) {
	var index, addMarkDown,
		triggerChars = [],
		markDown = [];

	addMarkDown = editor.addMarkDown = function( regExp, callback, triggerChar ) {
		var i, character;

		markDown.push( {
			regExp: regExp,
			callback: callback
		} );

		if ( ! triggerChar ) {
			return;
		}

		for ( i = 0; i < triggerChar.length; i++ ) {
			character = triggerChar.charAt( i );

			if ( tinymce.inArray( triggerChars, character ) === -1 && character !== ' ' ) {
				triggerChars.push( character );
			}
		}
	};

	// Always put the minus on the side. :)
	addMarkDown( /^[*+-]\s/, function() {
		this.execCommand( 'InsertUnorderedList' );
	} );

	addMarkDown( /^1[.)]\s/, function() {
		this.execCommand( 'InsertOrderedList' );
	} );

	addMarkDown( /^>\s/, function() {
		this.execCommand( 'mceBlockQuote' );
	} );

	addMarkDown( /^(#{2,6})\s/, function() {
		this.formatter.toggle( 'h' + arguments[1].length );
	} );

	// Ideally we also need to make sure there is no space just before the last *.
	addMarkDown( /(\*{1,2})(\S[^*]*)\*/, function() {
		if ( arguments[1].length === 2 ) {
			this.insertContent( '<strong>' + arguments[2] + '</strong>' );
		} else {
			this.insertContent( '<em>' + arguments[2] + '</em>' );
		}
	}, '*' );

	addMarkDown( /`(\S[^`]*)`/, function() {
		this.insertContent( '<code>' + arguments[1] + '</code>' );
	}, '`' );

	addMarkDown( /\[([^\]]+)\]\(([^)\s]+)(?:\s['"]([^)]+)['"])?\)/, function() {
		this.insertContent( '<a href="' + arguments[2] + '"' + ( arguments[3] ? ' title="' + arguments[3] + '"' : '' ) + '>' + arguments[1] + '</a>' );
	}, ')' );

	addMarkDown( /^---$/, function() {
		this.insertContent( '<hr>' );
	}, '-' );

	editor.on( 'keydown', function() {
		index = editor.selection.getRng().startOffset;
	} );

	editor.on( 'keyup', function( event ) {
		var node = editor.selection.getRng().startContainer,
			character;

		if ( node.nodeType !== 3 ) {
			return;
		}

		character = node.textContent.charAt( index );

		if ( event.keyCode !== tinymce.util.VK.SPACEBAR && tinymce.inArray( triggerChars, character ) === -1 ) {
			return;
		}

		tinymce.each( markDown, function( m ) {
			var args,
				replace = node.textContent.replace( m.regExp, function() {
					args = arguments;

					if ( m.regExp.source.charAt( 0 ) === '^' && node.parentNode.firstChild !== node ) {
						return arguments[0];
					}

					if ( m.regExp.source.charAt( m.regExp.source.length - 1 ) === '$' && node.parentNode.lastChild !== node ) {
						return arguments[0];
					}

					return '';
				} );

			if ( node.textContent === replace ) {
				return;
			}

			editor.undoManager.transact( function() {
				node.textContent = replace;

				editor.selection.setCursorLocation( node, args[ args.length - 2 ] );

				if ( m.regExp.source.charAt( 0 ) === '^' && replace === '' ) {
					editor.insertContent( '<br>' );
				}

				m.callback.apply( editor, args );
			} );
		} );
	} );
} );
