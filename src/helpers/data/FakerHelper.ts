import { faker } from '@faker-js/faker';

/**
 * FakerHelper - Additional fake data utilities.
 */
export class FakerHelper {
  static username(): string {
    return faker.internet.username();
  }

  static email(): string {
    return faker.internet.email();
  }

  static password(): string {
    return faker.internet.password({ length: 12, memorable: true });
  }

  static fullName(): string {
    return faker.person.fullName();
  }

  static firstName(): string {
    return faker.person.firstName();
  }

  static lastName(): string {
    return faker.person.lastName();
  }

  static phoneNumber(): string {
    return faker.phone.number();
  }

  static address(): string {
    return faker.location.streetAddress();
  }

  static city(): string {
    return faker.location.city();
  }

  static zipCode(): string {
    return faker.location.zipCode();
  }

  static country(): string {
    return faker.location.country();
  }

  static company(): string {
    return faker.company.name();
  }

  static url(): string {
    return faker.internet.url();
  }

  static uuid(): string {
    return faker.string.uuid();
  }

  static sentence(): string {
    return faker.lorem.sentence();
  }

  static paragraph(): string {
    return faker.lorem.paragraph();
  }

  static creditCardNumber(): string {
    return faker.finance.creditCardNumber();
  }
}
