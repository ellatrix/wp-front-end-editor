/* global tinymce */
tinymce.PluginManager.add( 'wpmore', function( editor ) {

	// Replace Read More/Next Page tags with images
	editor.on( 'BeforeSetContent', function( e ) {
		if ( e.content ) {
			if ( e.content.indexOf( '<!--more' ) !== -1 ) {
				e.content = e.content.replace( /<!--more(.*?)-->/g, function( match, moretext ) {
					return '<img src="' + tinymce.Env.transparentSrc + '" data-wp-more="' + moretext + '" ' +
						'class="wp-more-tag mce-wp-more" title="Read More..." data-mce-resize="false" data-mce-placeholder="1" />';
				});
			}

			if ( e.content.indexOf( '<!--nextpage-->' ) !== -1 ) {
				e.content = e.content.replace( /<!--nextpage-->/g,
					'<img src="' + tinymce.Env.transparentSrc + '" class="wp-more-tag mce-wp-nextpage" ' +
						'title="Page break" data-mce-resize="false" data-mce-placeholder="1" />' );
			}
			e.content = e.content.replace( /<!--(.*?)-->/g, '&lt;!--$1--&gt;' );
		}
	});

	// Replace images with tags
	editor.on( 'PostProcess', function( e ) {
		if ( e.get ) {
			e.content = e.content.replace(/<img[^>]+>/g, function( image ) {
				var match, moretext = '';

				if ( image.indexOf('wp-more-tag') !== -1 ) {
					if ( image.indexOf('mce-wp-more') !== -1 ) {
						if ( match = image.match( /data-wp-more="([^"]+)"/ ) ) {
							moretext = match[1];
						}
						image = '<!--more' + moretext + '-->';
					} else if ( image.indexOf('mce-wp-nextpage') !== -1 ) {
						image = '<!--nextpage-->';
					}
				}

				return image;
			});
			e.content = e.content.replace( /&lt;!--(.*?)--&gt;/g, '<!--$1-->' );
		}
	});

	// Display the tag name instead of img in element path
	editor.on( 'ResolveName', function( e ) {
		var dom = editor.dom,
			target = e.target;

		if ( target.nodeName === 'IMG' && dom.hasClass( target, 'wp-more-tag' ) ) {
			if ( dom.hasClass( target, 'mce-wp-more' ) ) {
				e.name = 'more';
			} else if ( dom.hasClass( target, 'mce-wp-nextpage' ) ) {
				e.name = 'nextpage';
			}
		}
	});

	// Make sure the "more" tag is in a separate paragraph
	editor.on( 'PreProcess', function( event ) {
		var more;

		if ( event.save ) {
			more = editor.dom.select( 'img.wp-more-tag', event.node );

			if ( more.length ) {
				tinymce.each( more, function( node ) {
					var parent = node.parentNode, p;

					if ( parent.nodeName === 'P' && parent.childNodes.length > 1 ) {
						p = editor.dom.create('p');
						parent.parentNode.insertBefore( p, parent );
						p.appendChild( node );
					}
				});
			}
		}
	});

	// Register commands
	editor.addCommand( 'WP_More', function( tag ) {
		var parent, html, title, p1, p2,
			classname = 'wp-more-tag',
			spacer = tinymce.Env.ie ? '' : '<br data-mce-bogus="1" />',
			dom = editor.dom,
			node = editor.selection.getNode();

		tag = tag || 'more';
		classname += ' mce-wp-' + tag;
		title = tag === 'more' ? 'More...' : 'Next Page';
		html = '<img src="' + tinymce.Env.transparentSrc + '" title="' + title + '" class="' + classname + '" ' +
			'data-mce-resize="false" data-mce-placeholder="1" />';

		if ( dom.hasClass( node, 'mce-content-body' ) ) {
			editor.insertContent( '<p>' + html + '</p><p></p>' );
			return;
		}

		// Get the top level parent node
		parent = dom.getParent( node, function( found ) {
			if ( found.parentNode && dom.hasClass( found.parentNode, 'mce-content-body' ) ) {
				return true;
			}

			return false;
		}, editor.getBody() );

		if ( parent ) {
			p1 = dom.create( 'p', null, html );
			dom.insertAfter( p1, parent );

			if ( ! ( p2 = p1.nextSibling ) ) {
				p2 = dom.create( 'p', null, spacer );
				dom.insertAfter( p2, p1 );
			}

			editor.nodeChanged();
			editor.selection.setCursorLocation( p2, 0 );
		}
	});

	editor.addCommand( 'WP_Page', function() {
		editor.execCommand( 'WP_More', 'nextpage' );
	});

	editor.addButton( 'wp_more', {
		tooltip: 'Insert Read More tag',
		onclick: function() {
			editor.execCommand( 'WP_More', 'more' );
		}
	});

	editor.addButton( 'wp_page', {
		tooltip: 'Page break',
		onclick: function() {
			editor.execCommand( 'WP_More', 'nextpage' );
		}
	});

} );
