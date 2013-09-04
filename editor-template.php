<div id="fee-main-bar" class="wp-core-ui fee-reset">
	<?php wp_nonce_field( 'fee_update_post_' . $post->ID ); ?>
	<div class="fee-item">
		<a id="fee-cats" href="#">
			<div class="has-dashicon" href="#"></div>
		</a>
		<div id="fee-cats-pop-up" class="fee-element">
			<div class="arrow-down"></div>
			<div style="overflow-y: scroll;height: 200px;">
				<ul id="categorychecklist" data-wp-lists="list:category" class="categorychecklist form-no-clear">
					<?php
						echo '<input type="hidden" name="post_category[]" value="0" />';
						require_once( ABSPATH . 'wp-admin/includes/template.php' );
						wp_terms_checklist( $post->ID, array( 'taxonomy' => 'category' ) );
					?>
				</ul>
			</div>
			<div style="margin-left: 10px;margin-top: 10px;">
				<input type="checkbox" checked="checked" />
				<input id="input-cats" placeholder="add...">
			</div>
		</div>
	</div>
	<div class="fee-item">
		<a id="fee-tags" href="#">
			<div class="has-dashicon" href="#"></div>
		</a>
		<div id="fee-tags-pop-up" class="fee-element">
			<div class="arrow-down"></div>
			<div id="fee-tags-list">
				<?php the_tags('<div class="fee-tag has-dashicon2">', '</div><div class="fee-tag has-dashicon2">', '</div>'); ?>
			</div>
			<input id="input-tags" class="fee-tag" placeholder="add...">
		</div>
	</div>
	<div class="fee-item">
		<a id="fee-media" class="insert-media add_media" href="#" data-editor="fee-edit-content-<?php echo $post->ID ?>">
			<div class="has-dashicon" href="#"></div>
		</a>
	</div>
	<div class="fee-item">
		<a id="fee-link" href="#">
			<div class="has-dashicon" href="#"></div>
		</a>
		<div id="fee-tags-pop-up" class="fee-element">
			<div class="arrow-down"></div>
			Coming soon...
		</div>
	</div>
	<?php media_buttons('fee-edit-content-' . $post->ID); ?>
	<a id="fee-save" class="button button-primary" href="#">Save <?php echo $post->post_type; ?></a>
	<a id="fee-options" class="fee-item has-dashicon" href="#"></a>
</div>
<div id="fee-saving" class="fee-reset"></div>
<div id="fee-success" class="wp-core-ui fee-reset">
	<div id="fee-message">
		<p id="fee-ajax-message">Post Updated.</p>
		<a id="fee-continue" class="button button-large" href="#">Continue editing</a><a class="button button-primary button-large" href="<?php echo get_permalink($post->ID); ?>">View <?php echo $post->post_type; ?></a>
	</div>
</div>
<div id="fee-mce-toolbar" class="fee-reset fee-element"></div>