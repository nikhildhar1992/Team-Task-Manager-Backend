const ApiError = require('../utils/apiError');

function validate(schemas) {
  return (req, _res, next) => {
    const targets = [
      { key: 'body', schema: schemas.body },
      { key: 'params', schema: schemas.params },
      { key: 'query', schema: schemas.query },
    ];

    for (const { key, schema } of targets) {
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        return next(
          new ApiError(400, `Invalid ${key}`, result.error.issues.map((issue) => issue.message)),
        );
      }

      req[key] = result.data;
    }

    return next();
  };
}

module.exports = validate;
