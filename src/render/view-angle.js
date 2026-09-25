// Угол камеры вокруг острова (0 — смотрим вдоль оси z). Спрайты и частицы разворачиваются к камере по нему.
export const viewAngle = { yaw: Math.PI / 4 }; // по умолчанию — по диагонали, как в изометрии

const sprites = []; // все спрайты (создаются один раз при запуске)

export function registerSprite(object) {
  object.rotation.y = viewAngle.yaw;
  sprites.push(object);
}

export function setViewYaw(yaw) {
  viewAngle.yaw = yaw;
  for (const o of sprites) o.rotation.y = yaw;
}
