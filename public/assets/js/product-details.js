
$(function() {
	"use strict";

	// NOTE: Slick carousel initialization has been moved to product-details-dynamic.js
	// to avoid race conditions and conflicts with dynamic product image loading.
	// The carousel is now initialized ONLY after product images are populated from the API.
	// This prevents the issue where the carousel was being initialized with template images
	// before being overwritten by real product images.

});
