import { faker } from '@faker-js/faker';

/**
 * TestDataFactory - Generates dynamic, realistic test data.
 * Uses Faker.js for realistic data generation.
 */
export class TestDataFactory {
  /**
   * Creates a valid user object.
   */
  static createUser(overrides?: Partial<UserData>): UserData {
    return {
      username: faker.internet.username(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      ...overrides,
    };
  }

  /**
   * Creates shipping address data.
   */
  static createShippingAddress(overrides?: Partial<ShippingAddress>): ShippingAddress {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      postalCode: faker.location.zipCode(),
      country: 'US',
      phone: faker.phone.number(),
      ...overrides,
    };
  }

  /**
   * Creates payment data.
   */
  static createPaymentInfo(overrides?: Partial<PaymentInfo>): PaymentInfo {
    return {
      cardNumber: faker.finance.creditCardNumber(),
      cardHolder: faker.person.fullName(),
      expiryMonth: faker.date.future().getMonth().toString().padStart(2, '0'),
      expiryYear: (faker.date.future().getFullYear()).toString(),
      cvv: faker.finance.creditCardCVV(),
      ...overrides,
    };
  }

  /**
   * Creates product data.
   */
  static createProduct(overrides?: Partial<ProductData>): ProductData {
    return {
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price()),
      category: faker.commerce.department(),
      sku: faker.string.alphanumeric(10).toUpperCase(),
      ...overrides,
    };
  }

  /**
   * Creates an order.
   */
  static createOrder(overrides?: Partial<OrderData>): OrderData {
    const items = Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
      productId: faker.string.uuid(),
      productName: faker.commerce.productName(),
      quantity: faker.number.int({ min: 1, max: 3 }),
      price: parseFloat(faker.commerce.price()),
    }));

    return {
      orderId: faker.string.alphanumeric(8).toUpperCase(),
      items,
      shipping: this.createShippingAddress(),
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      tax: 0,
      total: 0,
      ...overrides,
    };
  }

  /**
   * Creates a random string.
   */
  static string(length: number = 10): string {
    return faker.string.alphanumeric(length);
  }

  /**
   * Creates a random number.
   */
  static number(min: number = 0, max: number = 100): number {
    return faker.number.int({ min, max });
  }

  /**
   * Creates a random email.
   */
  static email(): string {
    return faker.internet.email();
  }

  /**
   * Creates a random date in the given range.
   */
  static date(from?: Date, to?: Date): Date {
    return faker.date.between({ from: from || new Date(2020, 0, 1), to: to || new Date() });
  }
}

// Data interfaces
export interface UserData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface PaymentInfo {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface ProductData {
  name: string;
  description: string;
  price: number;
  category: string;
  sku: string;
}

export interface OrderData {
  orderId: string;
  items: OrderItem[];
  shipping: ShippingAddress;
  subtotal: number;
  tax: number;
  total: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}
