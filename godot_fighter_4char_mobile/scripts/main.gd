extends Node2D
const FIGHTER_SCENE := preload("res://scenes/fighter.tscn")
const PROJECTILE_SCRIPT := preload("res://scripts/projectile.gd")
const FIGHTER_NAMES := ["GOJO SATORU", "STEVE", "SANS", "SASUKE"]
const FIGHTER_TAGS := [
	"BLUE / RED / PURPLE",
	"BUILD / MINE / MLG",
	"BONE / BLASTER / SOUL",
	"CHIDORI / AMATERASU / SUSANOO"
]
var fighters: Array[ArenaFighter] = []
var blocks: Array[StaticBody2D] = []
var flames: Array[ArenaProjectile] = []
var mode := 0  # 0 selection, 1 fight, 2 result
var selected := [0, 1]
var picking_player := 0
var ai_mode := true
var round_time := 99.0
var stage_floor: StaticBody2D
var camera: Camera2D
var hud
var viewport_size := Vector2(1280, 720)


func _ready() -> void:
	viewport_size = get_viewport_rect().size
	get_viewport().size_changed.connect(_on_viewport_resized)
	_setup_stage()
	var ui_layer := CanvasLayer.new()
	hud = Node2D.new()
	hud.set_script(load("res://scripts/hud.gd"))
	hud.main = self
	ui_layer.add_child(hud)
	add_child(ui_layer)
	InputRouter.ai_enabled = true


func _setup_stage() -> void:
	stage_floor = StaticBody2D.new()
	stage_floor.name = "StageFloor"
	stage_floor.collision_layer = 1
	stage_floor.collision_mask = 2
	var collision := CollisionShape2D.new()
	var floor_shape := RectangleShape2D.new()
	floor_shape.size = Vector2(2600, 100)
	collision.shape = floor_shape
	collision.position = Vector2(0, viewport_size.y - 17.0)
	stage_floor.add_child(collision)
	add_child(stage_floor)
	camera = Camera2D.new()
	camera.position = Vector2(640, 370)
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 3.0
	camera.limit_left = -250
	camera.limit_right = 1530
	camera.limit_top = 0
	camera.limit_bottom = 720
	add_child(camera)
	camera.make_current()


func _on_viewport_resized() -> void:
	viewport_size = get_viewport_rect().size
	if camera:
		camera.limit_bottom = int(viewport_size.y)
	queue_redraw()
	if hud:
		hud.queue_redraw()


func start_match() -> void:
	InputRouter.touches.clear()
	for f in fighters:
		if is_instance_valid(f):
			f.queue_free()
	fighters.clear()
	for b in blocks:
		if is_instance_valid(b):
			b.queue_free()
	blocks.clear()
	for n in get_tree().get_nodes_in_group("projectiles"):
		n.queue_free()
	mode = 1
	round_time = 99.0
	InputRouter.ai_enabled = ai_mode
	for i in range(2):
		var f: ArenaFighter = FIGHTER_SCENE.instantiate()
		add_child(f)
		f.setup(selected[i], i, self)
		f.position = Vector2(viewport_size.x * (0.34 if i == 0 else 0.66), viewport_size.y - 67.0)
		f.opponent = null
		fighters.append(f)
	fighters[0].opponent = fighters[1]
	fighters[1].opponent = fighters[0]


func return_to_select() -> void:
	mode = 0
	for f in fighters:
		if is_instance_valid(f):
			f.queue_free()
	fighters.clear()


func _process(delta: float) -> void:
	if mode == 1:
		round_time = maxf(0.0, round_time - delta)
		if (
			fighters.size() == 2 and fighters[0].hp <= 0
			or fighters.size() == 2 and fighters[1].hp <= 0
			or round_time <= 0.0
		):
			mode = 2
		if fighters.size() == 2:
			var center_x := (fighters[0].global_position.x + fighters[1].global_position.x) * 0.5
			camera.position.x = lerpf(camera.position.x, center_x, delta * 0.5)
			camera.position.y = viewport_size.y * 0.51
			for f in fighters:
				f.position.x = clampf(f.position.x, 44.0, viewport_size.x - 44.0)
	queue_redraw()


func spawn_hitbox(
	source: ArenaFighter, reach: float, height: float, damage: float, stun: int, label: String
) -> void:
	var space := get_world_2d().direct_space_state
	var rect := RectangleShape2D.new()
	rect.size = Vector2(reach, height)
	var params := PhysicsShapeQueryParameters2D.new()
	params.shape = rect
	params.transform = Transform2D(
		0.0, source.global_position + Vector2(source.facing * (reach * 0.5 + 14.0), -48.0)
	)
	params.collision_mask = 2
	params.exclude = [source.get_rid()]
	var results := space.intersect_shape(params, 16)
	for result in results:
		var body = result.collider
		if body is ArenaFighter and body == source.opponent:
			var final_damage := damage
			if label == "Susanoo slash" and _has_active_flame():
				final_damage += 10.0
				body.burn_frames = maxi(body.burn_frames, 120)
			body.take_hit(final_damage, source.facing, stun, label)
	# Brief visible swipe marker.
	var fx := HitFlash.new()
	fx.global_position = source.global_position + Vector2(source.facing * (reach * 0.45), -48)
	fx.tint = Color("#f8f0a0") if label != "Chidori" else Color("#8fe9ff")
	add_child(fx)


func _has_active_flame() -> bool:
	for flame in flames:
		if is_instance_valid(flame) and not flame.is_queued_for_deletion():
			return true
	return false


func spawn_projectile(
	source: ArenaFighter,
	kind: String,
	speed: float,
	damage: float,
	delay: float,
	duration: float,
	vertical_speed: float = 0.0
) -> void:
	var p: ArenaProjectile = PROJECTILE_SCRIPT.new()
	p.add_to_group("projectiles")
	p.setup(source, kind, speed, damage, delay, duration, vertical_speed)
	p.global_position = source.global_position + Vector2(source.facing * 48.0, -48)
	add_child(p)


func place_block(source: ArenaFighter) -> void:
	var block := StaticBody2D.new()
	block.name = "TemporaryBlock"
	block.collision_layer = 1
	block.collision_mask = 2
	var shape_node := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(58, 68)
	shape_node.shape = shape
	block.add_child(shape_node)
	block.global_position = source.global_position + Vector2(source.facing * 82.0, -36.0)
	block.set_meta("remaining", 4.5)
	add_child(block)
	blocks.append(block)
	# A block can also be placed below the Steve if the skill is used in the air.


func mine_nearby(source: ArenaFighter) -> void:
	for block in blocks.duplicate():
		if (
			is_instance_valid(block)
			and (
				block.global_position.distance_to(
					source.global_position + Vector2(source.facing * 70, 0)
				)
				< 180
			)
		):
			blocks.erase(block)
			block.queue_free()
	for p in get_tree().get_nodes_in_group("projectiles"):
		if (
			is_instance_valid(p)
			and (
				p.global_position.distance_to(
					source.global_position + Vector2(source.facing * 100, 0)
				)
				< 250
			)
		):
			p.queue_free()
	var fx := HitFlash.new()
	fx.global_position = source.global_position + Vector2(source.facing * 85, -38)
	fx.tint = Color("#9b7850")
	add_child(fx)


func spawn_flame(source: ArenaFighter) -> void:
	var p: ArenaProjectile = PROJECTILE_SCRIPT.new()
	p.kind = "flame"
	p.add_to_group("projectiles")
	p.setup(source, "flame", 0, 2.0, 0.15, 3.4)
	p.position = source.global_position + Vector2(source.facing * 125, -7)
	p.width = 105
	add_child(p)
	flames.append(p)


func steve_ultimate(source: ArenaFighter) -> void:
	# Restricted multi-projectile rain stays allocation-light and works on mobile GPUs.
	for i in range(8):
		var p: ArenaProjectile = PROJECTILE_SCRIPT.new()
		p.add_to_group("projectiles")
		p.setup(source, "rain", 0, 8.0, i * 0.08, 2.6, 0.0)
		p.position = Vector2(randf_range(80.0, viewport_size.x - 80.0), -50.0 - i * 28.0)
		add_child(p)


func sans_ultimate(source: ArenaFighter) -> void:
	if source.opponent:
		source.opponent.stun_frames = maxi(source.opponent.stun_frames, 150)
		for i in range(12):
			var p: ArenaProjectile = PROJECTILE_SCRIPT.new()
			p.add_to_group("projectiles")
			p.setup(source, "bone", 300.0, 6.0, i * 0.08, 2.6)
			p.position = source.global_position + Vector2(0, -randf_range(20, 180))
			p.velocity = Vector2(
				cos(TAU * float(i) / 12.0) * 300.0, sin(TAU * float(i) / 12.0) * 300.0
			)
			add_child(p)
	spawn_projectile(source, "blaster", 0.0, 18.0, 0.55, 1.5)


func _physics_process(_delta: float) -> void:
	for block in blocks.duplicate():
		if not is_instance_valid(block):
			blocks.erase(block)
			continue
		var rem: float = float(block.get_meta("remaining", 0.0)) - _delta
		block.set_meta("remaining", rem)
		if rem <= 0.0:
			blocks.erase(block)
			block.queue_free()


func _draw() -> void:
	var w := viewport_size.x
	var h := viewport_size.y
	# The painted arena and ground are background only; collisions are the stage-floor body.
	draw_rect(Rect2(-2000, 0, 5000, h), Color("#10182d"), true)
	for i in range(7):
		var y := h * 0.22 + i * h * 0.09
		draw_rect(Rect2(-2000, y, 5000, 1), Color(0.35, 0.48, 0.7, 0.08), true)
	draw_circle(Vector2(w * 0.5, h * 0.38), minf(w, h) * 0.23, Color(0.16, 0.25, 0.42, 0.19))
	draw_rect(Rect2(-2000, h - 67, 5000, 67), Color("#2e3546"), true)
	draw_rect(Rect2(-2000, h - 67, 5000, 5), Color("#8aa0bd"), true)
	for x in range(-1990, 3000, 90):
		draw_line(Vector2(x, h - 62), Vector2(x + 34, h), Color(0.8, 0.87, 1, 0.045), 2)
	for block in blocks:
		if is_instance_valid(block):
			draw_rect(
				Rect2(block.position - Vector2(29, 34), Vector2(58, 68)), Color("#9c734d"), true
			)
			draw_rect(
				Rect2(block.position - Vector2(29, 34), Vector2(58, 68)), Color("#d8b27d"), false, 3
			)


class HitFlash:
	extends Node2D
	var tint := Color.WHITE
	var age := 0.0

	func _process(delta: float) -> void:
		age += delta
		queue_redraw()
		if age > 0.16:
			queue_free()

	func _draw() -> void:
		draw_arc(Vector2.ZERO, 30 + age * 90, -0.9, 0.9, 12, Color(tint, 1.0 - age / 0.16), 5.0)
