import { IsClosedPolygonRingConstraint } from './is-closed-polygon-ring.validator';

/** @since 26.08.2026 */
describe('IsClosedPolygonRingConstraint', () => {
  const constraint = new IsClosedPolygonRingConstraint();

  const closedSquare = [
    [
      [28.9784, 41.0082],
      [28.9884, 41.0082],
      [28.9884, 41.0182],
      [28.9784, 41.0182],
      [28.9784, 41.0082],
    ],
  ];

  it('kapalı, geçerli bir tek halkalı polygon için true döner', () => {
    expect(constraint.validate(closedSquare)).toBe(true);
  });

  it('coordinates dizi değilse false döner', () => {
    expect(constraint.validate('not-an-array')).toBe(false);
  });

  it('coordinates boş dizi ise false döner', () => {
    expect(constraint.validate([])).toBe(false);
  });

  it('bir halka 4 noktadan azsa false döner', () => {
    const triangle = [
      [
        [28.9784, 41.0082],
        [28.9884, 41.0082],
        [28.9784, 41.0082],
      ],
    ];
    expect(constraint.validate(triangle)).toBe(false);
  });

  it('ilk ve son nokta aynı değilse (kapalı olmayan halka) false döner', () => {
    const unclosed = [
      [
        [28.9784, 41.0082],
        [28.9884, 41.0082],
        [28.9884, 41.0182],
        [28.9784, 41.0182],
      ],
    ];
    expect(constraint.validate(unclosed)).toBe(false);
  });

  it('bir nokta [lng, lat] çifti değilse false döner', () => {
    const malformed = [
      [
        [28.9784, 41.0082, 999],
        [28.9884, 41.0082],
        [28.9884, 41.0182],
        [28.9784, 41.0082],
      ],
    ];
    expect(constraint.validate(malformed)).toBe(false);
  });

  it('koordinat değeri geçerli lng/lat aralığının dışındaysa false döner', () => {
    const outOfRange = [
      [
        [200, 41.0082],
        [28.9884, 41.0082],
        [28.9884, 41.0182],
        [200, 41.0082],
      ],
    ];
    expect(constraint.validate(outOfRange)).toBe(false);
  });

  it('delikli (iç halkalı) bir polygon için her iki halka da kapalıysa true döner', () => {
    const withHole = [
      closedSquare[0],
      [
        [28.9804, 41.0102],
        [28.9824, 41.0102],
        [28.9824, 41.0122],
        [28.9804, 41.0122],
        [28.9804, 41.0102],
      ],
    ];
    expect(constraint.validate(withHole)).toBe(true);
  });
});
