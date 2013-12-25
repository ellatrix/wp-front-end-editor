(function(globals) {
	
	'use strict';
	
	globals.send_to_editor = function(stuff) {
		if (stuff.slice(0, 8) == '[gallery') {
			(function($) {
				$.ajax({
					type: 'POST',
					url: wp_fee.ajax_url,
					data: {
						'action': 'wpfee_shortcode',
						'shortcode': stuff
					},
					success: function(data) {
						tinyMCE.activeEditor.insertContent(data);
					}
				});
			}(jQuery));
		} else {
			tinyMCE.activeEditor.insertContent(stuff);
		}
	}
	
}(this));

(function($) {
	
	'use strict';
	
	$(document).ready(function() {
		
		var post_id = wp_fee.post_id;
		
		var $title = '#fee-edit-title-' + post_id;
		var $content = '#fee-edit-content-' + post_id;
		var $mce_toolbar = '#fee-mce-toolbar';
		var $saving = '#fee-saving';
		var $success = '#fee-success';
		
		var post_title = $($title).text();
		var doc_title = document.title.replace(post_title, '<!--replace-->');
		
		var post_content, post_category, tags_input, _wpnonce;
				
		$($title).attr('contenteditable', 'true');
		$($content).attr('contenteditable', 'true');
		
		$($title).on('keyup', function(e) {
			document.title = doc_title.replace('<!--replace-->', $(this).text());
		});
		
		tinymce.init({
			selector: $content,
			inline: true,
			plugins: 'autolink lists link charmap anchor table paste textcolor',
			toolbar1: 'bold italic underline strikethrough blockquote alignleft aligncenter alignright bullist numlist kitchensink',
			toolbar2: 'undo redo removeformat formatselect subscript superscript alignjustify outdent indent forecolor backcolor table',
			menubar: false,
			fixed_toolbar_container: $mce_toolbar,
			skin: 'wordpress',
			object_resizing: false,
			relative_urls: false,
			convert_urls: false,
			valid_elements: '*[*]',
			valid_children : '+div[style]',
			setup: function(editor) {
		        editor.on('focus', function(e) {
		        	$('.fee-element.fee-active').removeClass('fee-active');
		            $($mce_toolbar).addClass('fee-active').show();
		        });
		        editor.on('blur', function(e) {
		            $($mce_toolbar).removeClass('fee-active').hide();
		        });
				editor.addButton('kitchensink', {
					title: 'more...',
					onclick: function() {
						$('.mce-tinymce, .mce-abs-layout, .mce-abs-layout-item, .mce-stack-layout').removeAttr('style');
						$('.mce-toolbar:not(:first-child)').toggle();
					}
				});
				$('#fee-mce-toolbar').on('DOMNodeInserted', function(e) {
					if ( ! $('.mce-tinymce').hasClass('fee-style-removed') ) {
						$('.mce-tinymce, .mce-abs-layout, .mce-abs-layout-item, .mce-stack-layout').removeAttr('style');
						$('.mce-toolbar:not(:first-child)').hide();
					}
				});
				$(window).on('resize', function(e) {
					$('.mce-tinymce, .mce-tinymce .mce-abs-layout, .mce-tinymce .mce-abs-layout-item, .mce-tinymce .mce-stack-layout').removeAttr('style');
				});
		    }
		});
				
		$($mce_toolbar).draggable({
			containment: 'document',
			start: function() {
				$('.mce-floatpanel').hide();
			}
		});

		$(document).on( 'click', 'a:not(#wp-admin-bar-wp-fee-close a, .wp-fee-cancel, .post-edit-link)', function(e) {
			e.preventDefault();
		});
		
		$(document).on( 'hover', '.wp-fee-shortcode-container', function(e) {
			$(this).find('.wp-fee-shortcode-options').fadeToggle();
		});
		
		$(document).on( 'click', '.wp-fee-shortcode-remove', function(e) {
			$(this).parents('.wp-fee-shortcode-container').remove();
		});
		
		$('.insert-media.add_media a').data('editor', 'fee-edit-content-' + wp_fee.post_id)
		$('.insert-media.add_media a').addClass('insert-media add_media');
		
		$('.fee-edit-thumbnail').mouseenter(function() {
		    $(this).find('.fee-edit-thumbnail-button').fadeIn('slow');
		}).mouseleave(function() {
		    $(this).find('.fee-edit-thumbnail-button').fadeOut('slow');  
		});
		
		$('a[rel~="category"]').on('click', function(e) {
			e.preventDefault();
			$('.hover').not('#wp-admin-bar-wp-fee-cats').removeClass('hover');
			$('#wp-admin-bar-wp-fee-cats').toggleClass('hover');
		});
		
		$('a[rel="tag"]').on('click', function(e) {
			e.preventDefault();
			$('.hover').not('#wp-admin-bar-wp-fee-tags').removeClass('hover');
			$('#wp-admin-bar-wp-fee-tags').toggleClass('hover');
		});
		
		$('.menupop').on('mouseenter', function(e) {
			$('.hover').not(this).removeClass('hover');
		});
		
		var menupop_height = $(window).height() - 42;
		
		$('.ab-sub-wrapper').css({ 'max-height' : menupop_height + 'px', 'overflow' : 'scroll' });
		
		$('#input-tags').keypress(function(e) {
			if (e.which == 13) {
				var tag = $(this).val();
				$(this).val('');
				var newtag = '<li class="wp-fee-tags"><div class="ab-item ab-empty-item"><span class="ab-icon wp-fee-remove-tag"></span> <span class="wp-fee-tag">' + tag + '</span></div></li>';
				if (tag != '') {
					$('#wp-admin-bar-wp-fee-tags-default').append(newtag);
				}
				$('.wp-fee-remove-tag').on('click', function(e) {
					e.preventDefault();
					$(this).parent().remove();
				});
			}
		});
		
		$('.wp-fee-remove-tag').on('click', function(e) {
			e.preventDefault();
			$(this).parent().remove();
		});
		
		$('#fee-continue').on('click', function(e) {
			e.preventDefault();
			$($success).fadeOut('slow');
		});
				
		$('#fee-save').on('click', function(e) {
			e.preventDefault();
			$($saving).show();
			post_title = $($title).text();
			post_content = tinyMCE.activeEditor.getContent();
			post_content = $('<div>' + post_content + '</div>');
			post_content.find('.wp-fee-shortcode').each(function(i, val) {
				$(this).parents('.wp-fee-shortcode-container').replaceWith($(this).text());
			});
			post_content = $(post_content).html();
			post_category = $('input[name="post_category[]"]:checked').map(function() {
				return this.value;
			}).get();
			tags_input = '';
			$('.wp-fee-tag').each(function(e) {
				tags_input += $(this).text() + ', ';
			});
			tags_input = tags_input.slice(0, -2);
			_wpnonce = $('#_wpnonce').val();
			$.ajax({
				type: 'POST',
				url: wp_fee.ajax_url,
				data: {
					'action': 'wpfee_post',
					'ID': wp_fee.post_id,
					'post_title': post_title,
					'post_content': post_content,
					'post_category': post_category,
					'tags_input': tags_input,
					'_wpnonce': _wpnonce
				},
				success: function(data) {
					$($success).show();
					$($saving).hide();
				}
			});
		});

	});
	
}(jQuery));