<!-- move to admin bar
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
</div>-->
<div id="fee-saving" class="fee-reset"></div>
<div id="fee-success" class="wp-core-ui fee-reset">
	<div id="fee-message">
		<p id="fee-ajax-message">Post Updated.</p>
		<a id="fee-continue" class="button button-large" href="#">Continue editing</a><a class="button button-primary button-large" href="<?php echo get_permalink($post->ID); ?>">View <?php echo $post->post_type; ?></a>
	</div>
</div>
<div id="fee-mce-toolbar" class="fee-reset fee-element"></div>
<?php wp_nonce_field( 'fee_update_post_' . $post->ID ); ?>
<?php media_buttons( 'fee-edit-content-' . $post->ID ); ?>