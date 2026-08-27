import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/** GeoJSON Polygon coordinates'ini doğrular (kapalı halka, min 4 nokta, geçerli [lng,lat]) — PostGIS'e gitmeden burada elenir. */
@ValidatorConstraint({ name: 'isClosedPolygonRing', async: false })
export class IsClosedPolygonRingConstraint implements ValidatorConstraintInterface {
  validate(coordinates: unknown): boolean {
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return false;
    }

    return coordinates.every((ring) => this.isValidRing(ring));
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property}, geçerli bir GeoJSON Polygon olmalı: her halka en az 4 nokta ([lng, lat]) içermeli ve ilk/son nokta aynı olmalı`;
  }

  private isValidRing(ring: unknown): boolean {
    if (!Array.isArray(ring) || ring.length < 4) {
      return false;
    }

    if (!ring.every((point) => this.isValidPosition(point))) {
      return false;
    }

    const [firstLng, firstLat] = ring[0] as [number, number];
    const [lastLng, lastLat] = ring[ring.length - 1] as [number, number];
    return firstLng === lastLng && firstLat === lastLat;
  }

  private isValidPosition(point: unknown): boolean {
    if (!Array.isArray(point) || point.length !== 2) {
      return false;
    }

    const [lng, lat] = point as [unknown, unknown];
    return (
      typeof lng === 'number' &&
      typeof lat === 'number' &&
      lng >= -180 &&
      lng <= 180 &&
      lat >= -90 &&
      lat <= 90
    );
  }
}

export function IsClosedPolygonRing(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsClosedPolygonRingConstraint,
    });
  };
}
