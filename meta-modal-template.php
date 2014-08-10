<div class="wp-core-ui">
	<div id="fee-bar"></div>
	<div id="fee-notice-area" class="wp-core-ui">
		<?php if ( $notice ) : ?>
		<div id="notice" class="error"><p id="has-newer-autosave"><?php echo $notice ?></p><div class="dashicons dashicons-dismiss"></div></div>
		<?php endif; ?>
		<div id="lost-connection-notice" class="error hidden">
			<p><span class="spinner"></span> <?php _e( '<strong>Connection lost.</strong> Saving has been disabled until you&#8217;re reconnected.' ); ?>
			<span class="hide-if-no-sessionstorage"><?php _e( 'We&#8217;re backing up this post in your browser, just in case.' ); ?></span>
			</p>
		</div>
	</div>
	<div id="local-storage-notice" class="hidden">
		<p class="local-restore">
			The backup of this post in your browser is different from the version below. <a class="restore-backup" href="#">Restore the backup.</a>
		</p>
		<p class="undo-restore hidden">
			Post restored successfully. <a class="undo-restore-backup" href="#">Undo.</a>
		</p>
		<div class="dashicons dashicons-dismiss"></div>
	</div>
	<input type="hidden" id="post_ID" name="post_ID" value="<?php echo $post->ID; ?>">
	<div class="fee-toolbar">
		<?php if ( in_array( $post->post_status, array( 'auto-draft', 'draft', 'pending' ) ) ) { ?>
			<button class="button fee-save"><?php _e( 'Save' ); ?></button>
			<button class="button button-primary fee-publish"><?php _e( 'Publish' ); ?></button>
		<?php } else { ?>
			<button class="button button-primary fee-save"><?php _e( 'Update' ); ?></button>
		<?php } ?>
	</div>
	<div class="fee-alert fee-leave">
		<div class="fee-alert-body">
			<p><?php _e( 'The changes you made will be lost if you navigate away from this page.' ); ?> </p>
			<button class="button fee-cancel">Cancel</button>
			<?php if ( in_array( $post->post_status, array( 'auto-draft', 'draft', 'pending' ) ) ) { ?>
				<button class="button fee-save-and-exit"><?php _e( 'Save and leave' ); ?></button>
			<?php } else { ?>
				<button class="button fee-save-and-exit"><?php _e( 'Update and leave' ); ?></button>
			<?php } ?>
			<button class="button button-primary fee-exit">Leave</button>
		</div>
	</div>
</div>