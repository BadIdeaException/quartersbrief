import deepequal from 'deep-equal';
import { cloneProperties } from './util.js';

const originals = Symbol('originals');

function ComplexDataObject(data) {	
	// Recursively turn object properties into CDOs
	for (let key in data) {
		// Need to work on property descriptors here to avoid invoking getters.
		// This is so that lazily-expanded references aren't forced to expand here.
		let property = Object.getOwnPropertyDescriptor(data, key);
		if (typeof property.value === 'object' && property.value !== null)
			data[key] = ComplexDataObject(data[key]);
	}

	// Return the source if
	// - it is already a CDO
	// - it is a primitive
	// - it is a "custom" class, i.e. it's not directly derived from Object. Arrays are excepted from this and
	//   will be augmented.
	if (ComplexDataObject.isCDO(data) 
		|| typeof data !== 'object'
		|| (Object.getPrototypeOf(data) !== Object.prototype && !Array.isArray(data))) {
		return data;
	}
	
	// Augment data with CDO properties
	const methods = {
		multiply: function(key, factor) {
			let path = key.split('.');
			let currKeyRegex = new RegExp(`^${path.shift().replace('*', '\\w*')}$`);
			let targets = Object.keys(this).filter(key => currKeyRegex.test(key));

			if (path.length === 0)
				targets.forEach(target => {
					if (!(target in this[originals]))
						this[originals][target] = this[target];
					this[target] *= factor
				});
			else 
				targets.forEach(target => this[target].multiply(path.join('.'), factor));				
		},
		unmultiply: function(key, factor) {
			let path = key.split('.');
			let currKeyRegex = new RegExp(`^${path.shift().replace('*', '\\w*')}$`);
			let targets = Object.keys(this).filter(key => currKeyRegex.test(key));
			if (path.length === 0)
				targets.forEach(target => this[target] /= factor);
			else 
				targets.forEach(target => this[target].unmultiply(path.join('.'), factor));				
		},
		clear: function() {
			const descs = Object.getOwnPropertyDescriptors(this);
			for (let prop in descs) {
				const desc = descs[prop];
				if (typeof desc.value === 'object' && desc.value !== null && typeof desc.value.clear === 'function') 
					desc.value.clear();
				else if (typeof desc.value === 'number')
					this[prop] = this[originals][prop] ?? this[prop];
			}
		},
		get: function(key, options) {
			options ??= {};
			options.collate ??= !key.includes('*');

			let path = key.split('.');
			let currKeyRegex = new RegExp(`^${path.shift().replace('*', '\\w*')}$`);
			let targets = Object.keys(this)
				.filter(key => currKeyRegex.test(key));

			// If this is the destination property, get it for every target. Otherwise, call get
			// recursively with the rest of the path. In this case, we must use flatMap and 
			// turn off collation. This is to make sure that collating does not flatten
			// array properties, and that not collating does not produce deeply nested arrays
			// (i.e. arrays of arrays of arrays of ... - this is what would happen with .map())
			if (path.length > 0)
				targets = targets.flatMap(target => this[target].get(path.join('.'), { ...options, collate: false }));
			else
				targets = targets.map(target => this[target]);
			

			if (options.collate) {
				if (!targets.every(target => deepequal(target, targets[0])))
					throw new Error(`Expected all values to be equal while collating but they were not: ${targets}`);
				// We can just project to the first item, since we just checked that they're
				// all equal anyway
				targets = targets[0];
			}
			return targets;
		},
		freshCopy: function() {
			let dest;
			if (Array.isArray(this))
				dest = [];
			else 
				dest = Object.create(Object.getPrototypeOf(this));

			// Copy all enumerable properties by copying their descriptors
			for (let prop in this) {
				let desc = Object.getOwnPropertyDescriptor(this, prop);
				// If it is a value property, and it is an object, fresh-copy it
				if (typeof desc.value === 'object' && desc.value !== null)
					desc.value = desc.value.freshCopy();
				desc.value &&= this[originals][prop] ?? desc.value;
				Object.defineProperty(dest, prop, desc);
			}
			return ComplexDataObject(dest);
		},
		clone: function() {
			return cloneProperties(this);
		},	
	}
	Object.defineProperty(data, originals, {
		value: {},
		enumerable: false,
		configurable: true,
		writable: true
	});
	for (let method in methods)
		Object.defineProperty(data, method, {
			value: methods[method],
			enumerable: false,
			configurable: true
		});

	return data;
}

/**
 * Checks whether `instance` is a ComplexDataObject.
 */
ComplexDataObject.isCDO = function(instance) {
	return typeof instance === 'object' 
		&& instance !== null 
		&& originals in instance 
}

export { ComplexDataObject }