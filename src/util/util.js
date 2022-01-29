module.exports = {
	arrayIntersect: (arr1, arr2) => arr1.filter(x => arr2.includes(x)),

	arrayDifference: (arr1, arr2) => arr1.filter(x => !arr2.includes(x)),

	clone: require('just-clone')
}