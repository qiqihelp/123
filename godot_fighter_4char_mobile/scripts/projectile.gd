class_name ArenaProjectile
extends Node2D
var source_fighter: ArenaFighter
var kind := "bone"
var velocity := Vector2.ZERO
var damage := 6.0
var life := 2.0
var delay := 0.0
var width := 18.0
var _age := 0.0
var _hit := false
var _direction := 1
var _flame_tick := 0.0


func setup(
	source: ArenaFighter,
	type: String,
	speed: float,
	dmg: float,
	warmup: float,
	duration: float,
	vertical_speed: float = 0.0
) -> void:
	source_fighter = source
	kind = type
	_direction = source.facing
	velocity = Vector2(speed * _direction, vertical_speed)
	damage = dmg
	delay = warmup
	life = duration
	if type == "rain":
		velocity = Vector2(randf_range(-35.0, 35.0), randf_range(430.0, 700.0))
	if type == "blaster":
		velocity = Vector2.ZERO
	queue_redraw()


func _physics_process(delta: float) -> void:
	_age += delta
	if delay > 0.0:
		delay -= delta
		queue_redraw()
		return
	if kind == "blaster":
		if _age > 0.9 and not _hit:
			_hit = true
			if (
				source_fighter
				and source_fighter.opponent
				and absf(source_fighter.opponent.global_position.x - global_position.x) < 600
				and absf(source_fighter.opponent.global_position.y - global_position.y) < 80
			):
				source_fighter.opponent.take_hit(damage, _direction, 28, "Gaster Blaster")
	elif kind == "flame":
		if (
			source_fighter
			and source_fighter.opponent
			and absf(source_fighter.opponent.global_position.x - global_position.x) < width
			and absf(source_fighter.opponent.global_position.y - global_position.y) < 80
		):
			source_fighter.opponent.burn_frames = maxi(source_fighter.opponent.burn_frames, 100)
			_flame_tick += delta
			if _flame_tick >= 0.4:
				_flame_tick = 0.0
				source_fighter.opponent.take_hit(1.0, _direction, 0, "Amaterasu")
	else:
		position += velocity * delta
		if (
			not _hit
			and source_fighter
			and source_fighter.opponent
			and (
				position.distance_to(source_fighter.opponent.position)
				< (62.0 if kind == "rain" else 40.0)
			)
		):
			_hit = true
			source_fighter.opponent.take_hit(
				damage, _direction, 38 if kind == "purple" else 14, kind
			)
			if kind != "purple" and kind != "rain":
				queue_free()
	if _age >= life:
		queue_free()
	queue_redraw()


func _draw() -> void:
	match kind:
		"bone":
			draw_rect(Rect2(-6, -23, 12, 46), Color("#f5f2e8"), true)
			draw_circle(Vector2(0, -22), 8, Color("#f5f2e8"))
			draw_circle(Vector2(0, 22), 8, Color("#f5f2e8"))
		"red":
			draw_circle(Vector2.ZERO, 22, Color("#ff466f"))
			draw_circle(Vector2.ZERO, 11, Color("#ffb7ce"))
		"purple":
			draw_rect(Rect2(-20, -31, 40, 62), Color(0.62, 0.2, 1, 0.84), true)
			draw_line(Vector2(-20, 0), Vector2(20, 0), Color.WHITE, 4)
		"blaster":
			draw_circle(Vector2.ZERO, 30, Color("#e9efff"))
			draw_circle(Vector2.ZERO, 18, Color("#646c87"))
			if delay <= 0.0:
				draw_rect(
					Rect2(0 if _direction > 0 else -760, -12, 760, 24),
					Color(0.56, 0.88, 1, 0.55),
					true
				)
			else:
				draw_arc(Vector2.ZERO, 48, 0, TAU, 32, Color("#ffffaa"), 4)
		"flame":
			draw_rect(Rect2(-width, -12, width * 2, 18), Color(0.08, 0.06, 0.11, 0.96), true)
			draw_circle(Vector2(0, -13), 13, Color("#ff5c13"))
		"rain":
			draw_rect(Rect2(-8, -17, 16, 34), Color("#a7a3ff"), true)
