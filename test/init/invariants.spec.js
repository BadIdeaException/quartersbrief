import assertInvariants, { InvariantError } from '../../src/init/invariants.js';
import sinon from 'sinon';
import clone from 'clone';
import { readFileSync } from 'fs';


describe('assertInvariants', function() {	
	let TEST_DATA;
	let data;

	before(function() {
		TEST_DATA = JSON.parse(readFileSync('test/init/testdata/invariants.spec.json'));
	});

	beforeEach(function() {
		data = clone(TEST_DATA);
	});

	it('should call all its assertion functions with its data', function() {
		data = {};
		let assertions = [
			'assertHaveIDs',
			'assertHaveIndices',
			'assertHaveNames',
			'assertNoLabels',
			'assertModuleComponentsResolveUnambiguously',
			'assertWeaponAmmosAreOrdered',
		].map(name => sinon.stub(assertInvariants, name));

		// Need to explicitly do this because sinon-test seems to not be 
		// picking up on our stubs
		try {
			assertInvariants(data);
			for (let assertion of assertions)
				expect(assertion).to.have.been.calledWith(data);
		} finally {
			assertions.forEach(assertion => assertion.restore());
		}
	});

	it('should collect all InvariantErrors and throw them as an AggregateError at the end', function() {
		data = {};
		let assertions = [
			'assertHaveIDs',
			'assertHaveIndices',
			'assertHaveNames',
			'assertNoLabels',
			'assertModuleComponentsResolveUnambiguously',
			'assertWeaponAmmosAreOrdered',
		].map(name => sinon.stub(assertInvariants, name).throws(new InvariantError()));

		// Need to explicitly do this because sinon-test seems to not be 
		// picking up on our stubs
		try {
			expect(assertInvariants.bind(null, data)).to.throw(AggregateError);
		} finally {
			assertions.forEach(assertion => assertion.restore());
		}
	});

	describe('.assertHaveIDs', function() {
		it('should not error on data that has a numeric ID', function() {			
			expect(assertInvariants.assertHaveIDs.bind(null, data)).to.not.throw();
		});

		it('should throw an InvariantError if ID is not numeric', function() {
			data.PAAA001_Battleship.id = 'string';
			expect(assertInvariants.assertHaveIDs.bind(null, data)).to.throw(InvariantError);
		});

		it('should throw an InvariantError if ID is not present at all', function() {
			delete data.PAAA001_Battleship.id;
			expect(assertInvariants.assertHaveIDs.bind(null, data)).to.throw(InvariantError);
		});
	});

	describe('.assertHaveIndices', function() {
		it('should not error on data that has a well-formed index', function() {
			expect(assertInvariants.assertHaveIndices.bind(null, data)).to.not.throw();
		});

		it('should throw an InvariantError if index does not conform to the regex', function() {
			data.PAAA001_Battleship.index = 'ABCDEFG';
			expect(assertInvariants.assertHaveIndices.bind(null, data)).to.throw(InvariantError);
		});

		it('should throw an InvariantError if index is not present at all', function() {
			delete data.PAAA001_Battleship.index;
			expect(assertInvariants.assertHaveIndices.bind(null, data)).to.throw(InvariantError);
		});
	});

	describe('.assertHaveNames', function() {
		it('should not error on data that has a well-formed name', function() {
			expect(assertInvariants.assertHaveNames.bind(null, data)).to.not.throw();
		});

		it('should throw an InvariantError if name does not conform to the regex', function() {
			data.PAAA001_Battleship.name = 'ABCDEFG';
			expect(assertInvariants.assertHaveNames.bind(null, data)).to.throw(InvariantError);
		});

		it('should throw an InvariantError if name is not present at all', function() {
			let data = clone(TEST_DATA);
			delete data.PAAA001_Battleship.name;
			expect(assertInvariants.assertHaveNames.bind(null, data)).to.throw(InvariantError);
		});
	});

	describe('.assertNoLabels', function() {
		it('should error only if data has a property called label', function() {
			expect(assertInvariants.assertNoLabels.bind(null, data)).to.not.throw();
			data.PAAA001_Battleship.label = 'label';
			expect(assertInvariants.assertNoLabels.bind(null, data)).to.throw(InvariantError);
		});
	});

	describe('.assertModuleComponentsResolveUnambiguously', function() {
		it('should not error if all modules\'s components have length 1', function() {
			expect(assertInvariants.assertModuleComponentsResolveUnambiguously.bind(null, data)).to
				.not.throw();
		});

		it('should throw an InvariantError if there is a component definition of length > 1 without another one to remedy it', function() {
			data.PAAA001_Battleship.ShipUpgradeInfo.A_Hull.components['torpedoes'] = [ 'AB1_Torpedoes', 'AB2_Torpedoes' ];
			expect(assertInvariants.assertModuleComponentsResolveUnambiguously.bind(null, data)).to
				.throw(InvariantError);
		});

		it('should not error when there is a component with length > 1 but it is remedied by another', function() {
			// This will get remedied by the two Artillery module definitions:
			data.PAAA001_Battleship.ShipUpgradeInfo.A_Hull.components['artillery'] = [ 'AB1_Artillery', 'AB2_Artillery' ];
			expect(assertInvariants.assertModuleComponentsResolveUnambiguously.bind(null, data)).to
				.not.throw();
		});

		it('should not error when there is a component with length > 1 but it is remedied by several others', function() {
			let modules = data.PAAA001_Battleship.ShipUpgradeInfo
			modules.A_Hull.components['artillery'] = [ 'AB1_Artillery', 'AB2_Artillery', 'AB3_Artillery' ];
			modules.AB2_Artillery.components['artillery'] = ['AB2_Artillery', 'AB3_Artillery']
			delete modules['AB1_Artillery'];
			modules.SUO_STOCK.components['artillery'] = [ 'AB1_Artillery', 'AB3_Artillery' ];
			// data now allows
			// on A_Hull: AB1_Artillery, AB2_Artillery, AB3_Artillery
			// on AB2_Artillery: AB2_Artillery, AB3_Artillery
			// AB1_Artillery has been removed
			// on SUO_STOCK: AB1_Artillery, AB3_Artillery
			// This is resolvable to AB3_Artillery by combining all three
			expect(assertInvariants.assertModuleComponentsResolveUnambiguously.bind(null, data)).to
				.not.throw();
		});

		it('should ignore failed invariant checks for ships listed in assertInvariants.assertModuleComponentsResolveUnambiguously.IGNORE', function() {
			data.PAAA001_Battleship.ShipUpgradeInfo.A_Hull.components['torpedoes'] = [ 'AB1_Torpedoes', 'AB2_Torpedoes' ];
			let ignoreList = assertInvariants.assertModuleComponentsResolveUnambiguously.IGNORE;
			assertInvariants.assertModuleComponentsResolveUnambiguously.IGNORE = [ data.PAAA001_Battleship.name ];
			
			try {
				expect(assertInvariants.assertModuleComponentsResolveUnambiguously.bind(null, data)).to
					.not.throw();				
			} finally {
				assertInvariants.assertModuleComponentsResolveUnambiguously.IGNORE = ignoreList;
			}
		});

		it('should throw an InvariantError when there is a component with length > 1, but the remedy requires two modules of the same type', function() {
			let modules = data.PAAA001_Battleship.ShipUpgradeInfo;
			modules.A_Hull.components['artillery'] = [ 'AB1_Artillery', 'AB2_Artillery', 'AB3_Artillery' ];
			modules.AB1_Artillery.components['artillery'] = [ 'AB1_Artillery', 'AB3_Artillery' ];
			modules.AB2_Artillery.components['artillery'] = [ 'AB2_Artillery', 'AB3_Artillery' ];
			// data now allows
			// on A_Hull: AB1_Artillery, AB2_Artillery, AB3_Artillery
			// on AB1_Artillery: AB1_Artillery, AB3_Artillery
			// on AB2_Artillery: AB2_Artillery, AB3_Artillery
			// This is only resolvable by equipping AB1_Artillery and AB2_Artillery simultaneously,
			// which the algorithm should not allow
			expect(assertInvariants.assertModuleComponentsResolveUnambiguously.bind(null, data)).to
				.throw(InvariantError);
		});
	});

	describe('.assertWeaponAmmosAreOrdered', function() {
		it('should not error when all weapons\' ammos are always in the same order', function() {
			expect(assertInvariants.assertWeaponAmmosAreOrdered.bind(null, data)).to.not.throw();
		});

		it('should throw an InvariantError when weapons\' ammos are in a different order for different guns', function() {
			// Make the ammo lists of the second gun the reverse of the first gun in AB1_Artillery
			// Should fail
			data.PAAA001_Battleship.AB1_Artillery.HP_AGM_2.ammoList = clone(data.PAAA001_Battleship.AB1_Artillery.HP_AGM_1.ammoList).reverse(); // Need to clone because reverse() works in-place
			expect(assertInvariants.assertWeaponAmmosAreOrdered.bind(null, data)).to.throw(InvariantError);
		});

		it('should not throw if ammo order is different between different modules as long as it is consistent within the module', function() {
			// Make the ammo lists of all guns in AB2_Artillery be in reverse order from AB1_Artillery
			// Should pass, because the order is consistent within the modules
			data.PAAA001_Battleship.AB2_Artillery.HP_AGM_1.ammoList = clone(data.PAAA001_Battleship.AB1_Artillery.HP_AGM_1.ammoList).reverse(); // Need to clone because reverse() works in-place
			data.PAAA001_Battleship.AB2_Artillery.HP_AGM_2.ammoList = clone(data.PAAA001_Battleship.AB1_Artillery.HP_AGM_2.ammoList).reverse(); // Need to clone because reverse() works in-place
			expect(assertInvariants.assertWeaponAmmosAreOrdered.bind(null, data)).to.not.throw();			
		});
	});
});