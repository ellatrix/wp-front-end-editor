(function(globals) {
	
	'use strict';
	
	globals.send_to_editor = function(stuff) {
//		if (stuff.slice(0, 8) == '[gallery') {
//			(function($) {
//				$.ajax({
//					type: 'POST',
//					url: wp_front_end_editor.ajax_url,
//					data: {
//						'action': 'wpfee_shortcode',
//						'shortcode': stuff
//					},
//					success: function(data) {
//						tinyMCE.activeEditor.insertContent(data);
//					}
//				});
//			}(jQuery));
//		} else {
			tinyMCE.activeEditor.insertContent(stuff);
//		}
	}
	
}(this));

(function($) {
	
	'use strict';
	
	$(document).ready(function() {
		
		var post_id = wp_front_end_editor.post_id;
		
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
		
		var i = null;
		$('body').mousemove(function() {
		    clearTimeout(i);
		    $('#fee-main-bar, #wpadminbar').fadeIn('slow');
		    if ( $($mce_toolbar).hasClass('fee-active') ) {
		    	$($mce_toolbar).fadeIn('slow');
		    }
		    if ( ! $('#fee-main-bar, #wpadminbar, ' + $mce_toolbar).hasClass('fee-hovering') ) {
		    	i = setTimeout(function() {
		    	    $('#fee-main-bar, #wpadminbar, ' + $mce_toolbar).fadeOut('slow');
		    	}, 3000);
		    }
		}).mouseleave(function() {
		    clearTimeout(i);
		    $('#fee-main-bar, #wpadminbar, ' + $mce_toolbar).fadeOut('slow');  
		});
		
		$('#fee-main-bar, #wpadminbar, ' + $mce_toolbar).mouseenter(function() {
			$('#fee-main-bar, #wpadminbar, ' + $mce_toolbar).addClass('fee-hovering');
		}).mouseleave(function() {
		    $('#fee-main-bar, #wpadminbar, ' + $mce_toolbar).removeClass('fee-hovering');
		});
		
		$('.fee-edit-thumbnail').mouseenter(function() {
		    $(this).find('.fee-edit-thumbnail-button').fadeIn('slow');
		}).mouseleave(function() {
		    $(this).find('.fee-edit-thumbnail-button').fadeOut('slow');  
		});
		
		$('#fee-tags, #fee-cats, #fee-link').on('click', function(e) {
			e.preventDefault();
			var $target = $(this).next();
			$('.fee-element.fee-active').not($target).removeClass('fee-active');
			$target.toggleClass('fee-active');
		});
		
		$('a[rel~="category"]').on('click', function(e) {
			e.preventDefault();
			var $target = $('#fee-cats').next();
			$('.fee-element.fee-active').not($target).removeClass('fee-active');
			$target.toggleClass('fee-active');
		});
		
		$('a[rel="tag"]').on('click', function(e) {
			e.preventDefault();
			var $target = $('#fee-tags').next();
			$('.fee-element.fee-active').not($target).removeClass('fee-active');
			$target.toggleClass('fee-active');
		});
				
		$('#fee-media').on('click', function(e) {
			e.preventDefault();
			$('.fee-element.fee-active').removeClass('fee-active');
		});
		
		$('#input-tags').keypress(function(e) {
			if (e.which == 13) {
				var tag = $(this).val();
				$(this).val('');
				var newtag = '<div class="fee-tag has-dashicon2">' + tag + '</div>';
				if (tag != '') {
					$('#fee-tags-list').append(newtag);
				}
				$('#fee-tags-list .fee-tag').on('click', function(e) {
					e.preventDefault();
					$(this).remove();
				});
			}
		});
		
		$('#fee-tags-list .fee-tag').on('click', function(e) {
			e.preventDefault();
			$(this).remove();
		});
		
		$(document).on('DOMNodeInserted', '#fee-tags-list', function(e) {
			return;
		});
		
		$(document).on('click', '.media-button-select' , function() {
		     console.log('yes');
		});
		
		$('#fee-continue').on('click', function(e) {
			e.preventDefault();
			$($success).fadeOut('slow');
		});
		
		$('#wp-admin-bar-edit a').text('Cancel'); // lacking hook to change
		
		$('#fee-save').on('click', function(e) {
			e.preventDefault();
			$($saving).show();
			post_title = $($title).text();
			post_content = tinyMCE.activeEditor.getContent();
			post_content = post_content.replace(/>\s+</g,'><');
			post_category = $('input[name="post_category[]"]:checked').map(function() {
				return this.value;
			}).get();
			tags_input = '';
			$('#fee-tags-list .fee-tag').each(function(e) {
				tags_input += $(this).text() + ', ';
			});
			tags_input = tags_input.slice(0, -2);
			_wpnonce = $('#_wpnonce').val();
			$.ajax({
				type: 'POST',
				url: wp_front_end_editor.ajax_url,
				data: {
					'action': 'wpfee_post',
					'ID': wp_front_end_editor.post_id,
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