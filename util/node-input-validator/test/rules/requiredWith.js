const assert = require('assert');

const Validator = require('../../index');

describe('#requiredWith', () => {
  it('should return false for missing seed length', async () => {
    try {
      const v = new Validator({ age: 16 }, { remember: 'requiredWith' });

      await v.check();
    } catch (e) {
      assert.equal(e, 'Invalid arguments supplied for field remember in required with rule.');
    }

    // assert.equal(v.errors.remember.message, v.parseExistingMessageOnly('requiredIf', 'remember', '', ['age', '16']));
  });

  it('should pass', async () => {
    // validate with single seed
    const v = new Validator(
      {
        name: 'Harcharan Singh', sex: 'male', email: '', ip: '',
      },
      { email: 'email', ip: 'requiredWith:email|ip' }
    );

    const matched = await v.check();

    assert.equal(matched, true);
  });
  it('should pass', async () => {
    // validate with single seed
    const v = new Validator(
      {
        name: 'Harcharan Singh', sex: 'male', address: { street: 'fantastic' }, ip: '',
      },
      { email: 'email', sex: 'requiredWith:address.street' }
    );

    const matched = await v.check();

    assert.equal(matched, true);
  });

  it('should fail', async () => {
    // validate with multiple seeds
    const v = new Validator(
      {
        name: 'Harcharan Singh', sex: 'male', email: '', ip: '',
      },
      { email: 'requiredWith:name,sex' }
    );

    const matched = await v.check();

    assert.equal(matched, false);
  });
  it('should fail', async () => {
    // validate with multiple seeds
    const v = new Validator(
      {
        name: 'Harcharan Singh', address: { street: 'fantastic' }, email: '', ip: '',
      },
      { email: 'requiredWith:name,address.street' }
    );

    const matched = await v.check();

    assert.equal(matched, false);
  });

  it('should pass', async () => {
    // validate with multiple seeds
    const v = new Validator(
      {
        name: 'Harcharan Singh', sex: 'male', email: 'artisangang@gmail.com', ip: '',
      },
      { email: 'requiredWith:name,sex' }
    );

    const matched = await v.check();

    assert.equal(matched, true);
  });

  it('should fail', async () => {
    // check for fails
    const v = new Validator(
      {
        name: 'Harcharan Singh', sex: 'male', email: 'artisangang@gmail.com', ip: '',
      },
      { email: 'email', ip: 'requiredWith:email|ip' }
    );

    const matched = await v.check();
    assert.equal(matched, false);
    // should(v.errors).be.an.instanceOf(Object);
    // should(v.errors).have.property('ip');

    assert.equal(v.errors.ip.message, v.parseExistingMessageOnly('requiredWith', 'ip', '', 4));
  });
});
