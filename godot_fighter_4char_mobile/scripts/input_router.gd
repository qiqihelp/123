extends Node
## Unified keyboard + multi-touch provider. Touch fingers are tracked independently.
var touches: Dictionary = {}
var pressed: Array = [{}, {}]
var ai_enabled := true


func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			touches[event.index] = event.position
		else:
		touches.erase(event.index)
	elif event is InputEventScreenDrag:
		touches[event.index] = event.position


func frame_input(player: int, viewport_size: Vector2, allow_touch: bool = true) -> Dictionary:
	var movement := 0.0
	var jump := false
	var actions := {
		"attack": false, "skill1": false, "skill2": false, "ultimate": false, "block": false
	}
	if player == 0:
		movement = (
			(1.0 if Input.is_key_pressed(KEY_D) else 0.0)
			- (1.0 if Input.is_key_pressed(KEY_A) else 0.0)
		)
		jump = Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_SPACE)
		actions.attack = Input.is_key_pressed(KEY_J)
		actions.skill1 = Input.is_key_pressed(KEY_K)
		actions.skill2 = Input.is_key_pressed(KEY_L)
		actions.ultimate = Input.is_key_pressed(KEY_I)
		actions.block = Input.is_key_pressed(KEY_S)
	else:
		movement = (
			(1.0 if Input.is_key_pressed(KEY_RIGHT) else 0.0)
			- (1.0 if Input.is_key_pressed(KEY_LEFT) else 0.0)
		)
		jump = Input.is_key_pressed(KEY_UP)
		actions.attack = Input.is_key_pressed(KEY_KP_1)
		actions.skill1 = Input.is_key_pressed(KEY_KP_2)
		actions.skill2 = Input.is_key_pressed(KEY_KP_3)
		actions.ultimate = Input.is_key_pressed(KEY_KP_0)
		actions.block = Input.is_key_pressed(KEY_DOWN)
	if allow_touch:
		var visible_size := get_viewport().get_visible_rect().size
		for pos: Vector2 in touches.values():
			var p := Vector2(
				pos.x * viewport_size.x / maxf(visible_size.x, 1.0),
				pos.y * viewport_size.y / maxf(visible_size.y, 1.0)
			)
			if ai_enabled:
				if player == 0:
					if p.x < viewport_size.x * 0.40 and p.y > viewport_size.y * 0.72:
						var center := Vector2(viewport_size.x * 0.19, viewport_size.y * 0.81)
						movement = clampf((p.x - center.x) / 68.0, -1.0, 1.0)
						if p.y < center.y - 48.0:
							jump = true
					elif p.x > viewport_size.x * 0.56 and p.y > viewport_size.y * 0.60:
						var col := int(
							clampf(
								(p.x - viewport_size.x * 0.58) / (viewport_size.x * 0.39) * 4.0,
								0.0,
								3.0
							)
						)
						actions[["attack", "skill1", "skill2", "ultimate"][col]] = true
			else:
				if player == 0:
					if (
						p.x < viewport_size.x * 0.42
						and p.y > viewport_size.y * 0.60
						and p.y < viewport_size.y * 0.73
					):
						var col_left := int(
							clampf(
								(p.x - viewport_size.x * 0.02) / (viewport_size.x * 0.39) * 4.0,
								0.0,
								3.0
							)
						)
						actions[["attack", "skill1", "skill2", "ultimate"][col_left]] = true
					elif p.x < viewport_size.x * 0.40 and p.y > viewport_size.y * 0.72:
						var center_left := Vector2(viewport_size.x * 0.19, viewport_size.y * 0.81)
						movement = clampf((p.x - center_left.x) / 68.0, -1.0, 1.0)
						if p.y < center_left.y - 48.0:
							jump = true
				else:
					if (
						p.x > viewport_size.x * 0.58
						and p.y > viewport_size.y * 0.60
						and p.y < viewport_size.y * 0.73
					):
						var col_right := int(
							clampf(
								(p.x - viewport_size.x * 0.58) / (viewport_size.x * 0.39) * 4.0,
								0.0,
								3.0
							)
						)
						actions[["attack", "skill1", "skill2", "ultimate"][col_right]] = true
					elif p.x > viewport_size.x * 0.60 and p.y > viewport_size.y * 0.72:
						var center_right := Vector2(viewport_size.x * 0.81, viewport_size.y * 0.81)
						movement = clampf((p.x - center_right.x) / 68.0, -1.0, 1.0)
						if p.y < center_right.y - 48.0:
							jump = true
	return {"move": movement, "jump": jump, "actions": actions}
