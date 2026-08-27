import { validate } from './env.validation';

const validConfig = {
  NODE_ENV: 'development',
  PORT: '3000',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NAME: 'geofence_tracking',
  DB_USER: 'geofence',
  DB_PASSWORD: 'geofence',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
};

/** @since 26.08.2026 */
describe('env.validation', () => {
  it('geçerli bir config verildiğinde string alanları doğru tipe çevirir', () => {
    const result = validate(validConfig);

    expect(result.PORT).toBe(3000);
    expect(result.DB_PORT).toBe(5432);
    expect(result.NODE_ENV).toBe('development');
  });

  it('zorunlu bir alan eksikse hata fırlatır', () => {
    const { DB_HOST, ...withoutDbHost } = validConfig;
    void DB_HOST;

    expect(() => validate(withoutDbHost)).toThrow();
  });

  it('NODE_ENV geçersiz bir değerdeyse hata fırlatır', () => {
    expect(() => validate({ ...validConfig, NODE_ENV: 'staging' })).toThrow();
  });

  it('PORT sayısal olmayan bir değerdeyse hata fırlatır', () => {
    expect(() => validate({ ...validConfig, PORT: 'not-a-number' })).toThrow();
  });
});
