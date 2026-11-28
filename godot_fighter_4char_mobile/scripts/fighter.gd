class_name ArenaFighter
extends CharacterBody2D

enum State { IDLE, WALK, JUMP, ATTACK, HITSTUN, BLOCK }
const GRAVITY := 1450.0
const SPEED := 310.0
const JUMP_VELOCITY := -650.0
const COLORS := [Color("#51c7ff"), Color("#58bd75"), Color("#e5e8ef"), Color("#8b71ff")]
const LABELS := ["GOJO", "STEVE", "SANS", "SASUKE"]
var fighter_id := 0
var player_id := 0
var manager
var opponent: ArenaFighter
var hp := 100.0
var max_hp := 100.0
var facing := 1
var state: State = State.IDLE
var state_frame := 0
var attack_cd := 0
var stun_frames := 0
var invuln_frames := 0
var buff_frames := 0
var burn_frames := 0
var burn_tick := 0
var ai_clock := 0
var hit_once := false
var guard_held := false
var name_label := ""


func setup(id: int, owner_id: int, game: Node) -> void:
	fighter_id = id
	player_id = owner_id
	manager = game
	name_label = LABELS[id]
	add_child(CollisionShape2D.new())
	var shape := RectangleShape2D.new()
	shape.size = Vector2(36, 92)
	$CollisionShape2D.shape = shape
	$CollisionShape2D.position = Vector2(0, -46)


func _physics_process(delta: float) -> void:
	state_frame += 1
	if attack_cd > 0:
		attack_cd -= 1
	if invuln_frames > 0:
		invuln_frames -= 1
	if buff_frames > 0:
		buff_frames -= 1
	if burn_frames > 0:
		burn_frames -= 1
		burn_tick += 1
		if burn_tick >= 30:
			burn_tick = 0
			hp = maxf(0.0, hp - 1.5)
	if not is_on_floor():
		velocity.y += GRAVITY * delta
	else:
		if velocity.y > 0:
			velocity.y = 0
	if hp <= 0:
		velocity.x = move_toward(velocity.x, 0.0, 35.0)
		move_and_slide()
		queue_redraw()
		return
	var controls: Dictionary
	if player_id == 1 and InputRouter.ai_enabled:
		controls = _ai_input()
	else:
		controls = InputRouter.frame_input(player_id, get_viewport_rect().size)
	var actions: Dictionary = controls.actions
	guard_held = actions.block
	if opponent and absf(opponent.global_position.x - global_position.x) > 8:
		facing = 1 if opponent.global_position.x > global_position.x else -1
	if stun_frames > 0:
		stun_frames -= 1
		state = State.HITSTUN
		velocity.x = move_toward(velocity.x, 0.0, 15.0)
	else:
		if guard_held and is_on_floor():
			state = State.BLOCK
			velocity.x = move_toward(velocity.x, 0.0, 32.0)
		else:
			var move_axis: float = float(controls.move)
			velocity.x = move_axis * SPEED
			state = State.WALK if absf(move_axis) > 0.1 else State.IDLE
			if bool(controls.jump) and is_on_floor():
				velocity.y = JUMP_VELOCITY
				state = State.JUMP
			if attack_cd == 0:
				if actions.ultimate:
					_use_ultimate()
				elif actions.skill1:
					_use_skill_one()
				elif actions.skill2:
					_use_skill_two()
				elif actions.attack:
					_basic_attack()
	move_and_slide()
	queue_redraw()


func _ai_input() -> Dictionary:
	var d := {
		"move": 0.0,
		"jump": false,
		"actions":
		{"attack": false, "skill1": false, "skill2": false, "ultimate": false, "block": false}
	}
	if not opponent:
		return d
	var distance := opponent.global_position.x - global_position.x
	if absf(distance) > 104.0:
		d.move = signf(distance)
	ai_clock += 1
	if ai_clock > 55:
		ai_clock = randi_range(0, 16)
		var roll := randi_range(0, 9)
		if roll < 5:
			d.actions.attack = true
		elif roll < 7:
			d.actions.skill1 = true
		elif roll < 9:
			d.actions.skill2 = true
		else:
			d.actions.ultimate = true
	return d


func _basic_attack() -> void:
	attack_cd = 30
	state = State.ATTACK
	state_frame = 0
	var dmg := [7.0, 9.0, 5.0, 9.0][fighter_id]
	manager.spawn_hitbox(self, 68.0 if fighter_id != 2 else 78.0, 48.0, dmg, 8, "basic")


func _use_skill_one() -> void:
	attack_cd = 65
	state = State.ATTACK
	match fighter_id:
		0:  # Blue: short spatial pull / dash
			global_position.x += facing * 90.0
			manager.spawn_hitbox(self, 118.0, 62.0, 13.0, 10, "Blue pull")
		1:  # Place a temporary jumpable block
			manager.place_block(self)
		2:  # Bone volley
			for i in range(3):
				manager.spawn_projectile(self, "bone", 380.0, 6.0, 0.0, 2.6, float(i - 1) * 70.0)
		3:  # Chidori charge
			invuln_frames = 18
			velocity.x = facing * 920.0
			manager.spawn_hitbox(self, 138.0, 70.0, 19.0, 16, "Chidori")


func _use_skill_two() -> void:
	attack_cd = 80
	state = State.ATTACK
	match fighter_id:
		0:
			manager.spawn_projectile(self, "red", 560.0, 18.0, 0.0, 2.4)
		1:
			manager.mine_nearby(self)
			manager.spawn_hitbox(self, 108.0, 56.0, 8.0, 5, "Pickaxe")
		2:
			manager.spawn_projectile(self, "blaster", 660.0, 22.0, 0.48, 2.0)
		3:
			manager.spawn_flame(self)


func _use_ultimate() -> void:
	attack_cd = 150
	state = State.ATTACK
	match fighter_id:
		0:
			manager.spawn_projectile(self, "purple", 470.0, 31.0, 0.0, 3.0)
		1:
			manager.steve_ultimate(self)
		2:
			manager.sans_ultimate(self)
		3:
			buff_frames = 180
			invuln_frames = 35
			manager.spawn_hitbox(self, 238.0, 114.0, 25.0, 12, "Susanoo slash")


func take_hit(damage: float, from_direction: int, hitstun: int = 12, label: String = "hit") -> void:
	if invuln_frames > 0 or hp <= 0:
		return
	if state == State.BLOCK and from_direction == -facing:
		damage *= 0.22
		hitstun = 3
	hp = maxf(0.0, hp - damage)
	stun_frames = maxi(stun_frames, hitstun)
	state = State.HITSTUN
	state_frame = 0
	velocity.x = from_direction * (185.0 if damage < 15.0 else 285.0)
	if label == "Blue pull":
		velocity.x = -from_direction * 105.0
	queue_redraw()


func _draw() -> void:
	var body_color: Color = COLORS[fighter_id]
	if invuln_frames > 0 and invuln_frames % 6 < 3:
		body_color = Color.WHITE
	if buff_frames > 0:
		body_color = body_color.lightened(0.35)
	# Chunky silhouette with simple character-specific details.
	draw_rect(Rect2(-17, -70, 34, 50), body_color, true)
	draw_circle(Vector2(0, -81), 14, body_color.lightened(0.15))
	draw_rect(Rect2(-17, -21, 13, 21), body_color.darkened(0.12), true)
	draw_rect(Rect2(4, -21, 13, 21), body_color.darkened(0.12), true)
	if fighter_id == 0:
		draw_rect(Rect2(-14, -91, 28, 6), Color("#14182b"), true)
		draw_line(Vector2(5 * facing, -81), Vector2(11 * facing, -81), Color.BLACK, 2)
	elif fighter_id == 1:
		draw_rect(Rect2(-15, -94, 30, 7), Color("#55a3e8"), true)
		draw_rect(Rect2(-3, -86, 6, 4), Color("#273f30"), true)
	elif fighter_id == 2:
		draw_circle(Vector2(-5, -82), 2.5, Color.BLACK)
		draw_circle(Vector2(5, -82), 2.5, Color.BLACK)
		draw_arc(Vector2(0, -77), 6, 0, PI, 16, Color.BLACK, 1.5)
	else:
		draw_polygon(
			PackedVector2Array(
				[
					Vector2(-12, -92),
					Vector2(-6, -101),
					Vector2(-2, -91),
					Vector2(4, -100),
					Vector2(12, -91)
				]
			),
			[Color("#201c35")]
		)
	if state == State.BLOCK:
		draw_arc(Vector2.ZERO, 52, -1.0, 1.0, 24, Color("#9fe9ff"), 3.0)
	if burn_frames > 0:
		draw_circle(Vector2(0, -42), 22, Color(1.0, 0.28, 0.04, 0.22))
	draw_string(
		ThemeDB.fallback_font,
		Vector2(-28, -105),
		name_label,
		HORIZONTAL_ALIGNMENT_CENTER,
		56,
		10,
		Color.WHITE
	)
