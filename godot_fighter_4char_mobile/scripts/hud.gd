extends Node2D
var main
var font: Font = ThemeDB.fallback_font
var size := Vector2(1280, 720)
var safe_top := 16.0
var safe_bottom := 16.0


func _ready() -> void:
	get_viewport().size_changed.connect(_resize)
	_resize()


func _resize() -> void:
	size = get_viewport().get_visible_rect().size
	# Android/iOS provide physical safe-area bounds; clamp to the canvas coordinate range.
	var safe := DisplayServer.get_display_safe_area()
	var screen := DisplayServer.screen_get_size()
	if screen.x > 0 and screen.y > 0 and safe.size.y > 0:
		var scale_y := size.y / float(screen.y)
		safe_top = maxf(16.0, float(safe.position.y) * scale_y)
		safe_bottom = maxf(16.0, float(screen.y - (safe.position.y + safe.size.y)) * scale_y)
	else:
		safe_top = 16.0
		safe_bottom = 16.0
	queue_redraw()


func _draw() -> void:
	if not main:
		return
	if main.mode == 0:
		_draw_select()
	elif main.mode == 1:
		_draw_fight()
	else:
		_draw_result()


func _draw_select() -> void:
	var w := size.x
	var s := minf(w / 1280.0, size.y / 720.0)
	_draw_text(
		"FOURFOLD ARENA",
		Vector2(w * 0.5, safe_top + 72 * s),
		44 * s,
		Color("#f1f5ff"),
		HORIZONTAL_ALIGNMENT_CENTER
	)
	_draw_text(
		"2D LOCAL FIGHTER  •  CHOOSE YOUR FIGHTERS",
		Vector2(w * 0.5, safe_top + 105 * s),
		16 * s,
		Color("#94b2d8"),
		HORIZONTAL_ALIGNMENT_CENTER
	)
	var card_w := minf(205 * s, w * 0.22)
	var gap := 15 * s
	var start_x := (w - (card_w * 4 + gap * 3)) * 0.5
	var card_y := size.y * 0.31
	for i in range(4):
		var rect := Rect2(start_x + i * (card_w + gap), card_y, card_w, 190 * s)
		var c: Color = ArenaFighter.COLORS[i]
		_draw_panel(rect, c, main.selected[main.picking_player] == i)
		_draw_fighter_icon(rect.position + Vector2(card_w * 0.5, 75 * s), i, s)
		_draw_text(
			main.FIGHTER_NAMES[i],
			Vector2(rect.position.x + card_w * 0.5, rect.position.y + 135 * s),
			21 * s,
			Color.WHITE,
			HORIZONTAL_ALIGNMENT_CENTER
		)
		_draw_text(
			main.FIGHTER_TAGS[i],
			Vector2(rect.position.x + card_w * 0.5, rect.position.y + 161 * s),
			9 * s,
			Color("#b4c5df"),
			HORIZONTAL_ALIGNMENT_CENTER
		)
	var pick_name := "P1 SELECT" if main.picking_player == 0 else "P2 SELECT"
	_draw_text(
		"%s  ·  %s" % [pick_name, main.FIGHTER_NAMES[main.selected[main.picking_player]]],
		Vector2(w * 0.5, size.y * 0.63),
		20 * s,
		Color("#dbe8ff"),
		HORIZONTAL_ALIGNMENT_CENTER
	)
	var toggle := Rect2(w * 0.5 - 150 * s, size.y * 0.68, 145 * s, 48 * s)
	var start := Rect2(w * 0.5 + 8 * s, size.y * 0.68, 175 * s, 48 * s)
	_draw_button(
		toggle, "PICK P2" if main.picking_player == 0 else "PICK P1", Color("#374764"), 15 * s
	)
	_draw_button(start, "START FIGHT", Color("#694ed0"), 16 * s)
	var ai_rect := Rect2(w * 0.5 - 100 * s, size.y * 0.77, 200 * s, 38 * s)
	_draw_button(
		ai_rect,
		"AI: ON  (tap to toggle)" if main.ai_mode else "2P TOUCH / KEYBOARD",
		Color("#202b42"),
		12 * s
	)
	_draw_text(
		"PC: A/D + W / J K L I     •     MOBILE: LANDSCAPE TOUCH CONTROLS",
		Vector2(w * 0.5, size.y - safe_bottom - 18 * s),
		12 * s,
		Color("#93a3bf"),
		HORIZONTAL_ALIGNMENT_CENTER
	)


func _draw_fight() -> void:
	if main.fighters.size() != 2:
		return
	var w := size.x
	var s := minf(w / 1280.0, size.y / 720.0)
	var top := safe_top + 12 * s
	var bar_w := w * 0.34
	var bar_h := 24 * s
	_draw_health(Vector2(w * 0.07, top), bar_w, bar_h, main.fighters[0], true)
	_draw_health(Vector2(w * 0.59, top), bar_w, bar_h, main.fighters[1], false)
	_draw_text(
		"%02d" % int(ceil(main.round_time)),
		Vector2(w * 0.5, top + 31 * s),
		24 * s,
		Color.WHITE,
		HORIZONTAL_ALIGNMENT_CENTER
	)
	_draw_text(
		"%s  VS  %s" % [main.FIGHTER_NAMES[main.selected[0]], main.FIGHTER_NAMES[main.selected[1]]],
		Vector2(w * 0.5, top + 55 * s),
		12 * s,
		Color("#bccce4"),
		HORIZONTAL_ALIGNMENT_CENTER
	)
	_draw_text(
		"AI" if main.ai_mode else "2P",
		Vector2(w * 0.5, top + 75 * s),
		10 * s,
		Color("#879bb9"),
		HORIZONTAL_ALIGNMENT_CENTER
	)
	# Mobile input affordances. All touch actions are independently tracked by finger id.
	var control_y := size.y - safe_bottom - 102 * s
	_draw_joystick(Vector2(w * 0.18, control_y), s, "P1 MOVE / JUMP")
	var labels := ["HIT", "S1", "S2", "ULT"]
	for i in range(4):
		var bx := w * 0.61 + i * w * 0.087
		var by := control_y + (13 * s if i % 2 == 0 else -30 * s)
		_draw_button(
			Rect2(bx, by, 68 * s, 48 * s),
			labels[i],
			[Color("#445a7a"), Color("#397b91"), Color("#9c4c51"), Color("#744a9b")][i],
			12 * s
		)
	if not main.ai_mode:
		_draw_joystick(Vector2(w * 0.81, control_y), s, "P2 MOVE / JUMP")
		for i in range(4):
			var left_x := w * 0.02 + i * w * 0.0975
			var right_x := w * 0.58 + i * w * 0.0975
			var button_y := size.y * 0.60
			_draw_button(
				Rect2(left_x, button_y, 0.087 * w, 42 * s),
				labels[i],
				[Color("#445a7a"), Color("#397b91"), Color("#9c4c51"), Color("#744a9b")][i],
				10 * s
			)
			_draw_button(
				Rect2(right_x, button_y, 0.087 * w, 42 * s),
				labels[i],
				[Color("#445a7a"), Color("#397b91"), Color("#9c4c51"), Color("#744a9b")][i],
				10 * s
			)
		_draw_text(
			"P2 arrows + numpad 1/2/3/0  •  mirrored touch layout",
			Vector2(w * 0.5, size.y - safe_bottom - 9 * s),
			10 * s,
			Color("#91a1bc"),
			HORIZONTAL_ALIGNMENT_CENTER
		)
	var pause := Rect2(w - 92 * s, top + 70 * s, 72 * s, 30 * s)
	_draw_button(pause, "MENU", Color("#303d56"), 11 * s)


func _draw_result() -> void:
	var w := size.x
	var winner := "DRAW"
	if main.fighters.size() == 2:
		if main.fighters[0].hp > main.fighters[1].hp:
			winner = main.FIGHTER_NAMES[main.selected[0]] + " WINS"
		elif main.fighters[1].hp > main.fighters[0].hp:
			winner = main.FIGHTER_NAMES[main.selected[1]] + " WINS"
	_draw_text(
		"ROUND OVER",
		Vector2(w * 0.5, size.y * 0.34),
		24,
		Color("#99b5da"),
		HORIZONTAL_ALIGNMENT_CENTER
	)
	_draw_text(
		winner, Vector2(w * 0.5, size.y * 0.44), 46, Color.WHITE, HORIZONTAL_ALIGNMENT_CENTER
	)
	_draw_button(Rect2(w * 0.5 - 200, size.y * 0.58, 180, 55), "REMATCH", Color("#654cd0"), 17)
	_draw_button(
		Rect2(w * 0.5 + 20, size.y * 0.58, 180, 55), "CHARACTER SELECT", Color("#34435f"), 14
	)


func _draw_health(pos: Vector2, width: float, height: float, f: ArenaFighter, left: bool) -> void:
	_draw_text(
		main.FIGHTER_NAMES[f.fighter_id],
		Vector2(pos.x, pos.y - 5),
		14,
		Color.WHITE,
		HORIZONTAL_ALIGNMENT_LEFT if left else HORIZONTAL_ALIGNMENT_RIGHT
	)
	_draw_panel(Rect2(pos.x, pos.y, width, height), Color("#27344d"), false)
	var ratio := clampf(f.hp / f.max_hp, 0, 1)
	var fill := Rect2(pos.x + 3, pos.y + 3, (width - 6) * ratio, height - 6)
	if not left:
		fill.position.x = pos.x + 3 + (width - 6) * (1 - ratio)
	draw_rect(fill, Color("#66dfa0") if ratio > 0.35 else Color("#ff6778"), true)
	draw_rect(Rect2(pos.x, pos.y, width, height), Color("#d5e4fb"), false, 2)


func _draw_joystick(center: Vector2, scale: float, caption: String) -> void:
	draw_circle(center, 54 * scale, Color(0.15, 0.22, 0.34, 0.42))
	draw_arc(center, 54 * scale, 0, TAU, 32, Color(0.73, 0.83, 0.98, 0.6), 2 * scale)
	draw_circle(center, 22 * scale, Color(0.6, 0.75, 0.95, 0.36))
	_draw_text(
		caption,
		center + Vector2(0, 75 * scale),
		10 * scale,
		Color("#dce8fa"),
		HORIZONTAL_ALIGNMENT_CENTER
	)
	_draw_text(
		"▲",
		center + Vector2(0, -40 * scale),
		17 * scale,
		Color("#dce8fa"),
		HORIZONTAL_ALIGNMENT_CENTER
	)


func _draw_fighter_icon(center: Vector2, id: int, scale: float) -> void:
	var c: Color = ArenaFighter.COLORS[id]
	draw_rect(Rect2(center.x - 18 * scale, center.y - 3 * scale, 36 * scale, 45 * scale), c, true)
	draw_circle(center + Vector2(0, -18 * scale), 15 * scale, c.lightened(0.15))
	if id == 1:
		draw_rect(
			Rect2(center.x - 15 * scale, center.y - 34 * scale, 30 * scale, 6 * scale),
			Color("#55a3e8"),
			true
		)
	elif id == 2:
		draw_circle(center + Vector2(-5 * scale, -19 * scale), 2 * scale, Color.BLACK)
		draw_circle(center + Vector2(5 * scale, -19 * scale), 2 * scale, Color.BLACK)


func _draw_panel(rect: Rect2, color: Color, selected: bool) -> void:
	draw_rect(rect, Color(color, 0.14), true)
	draw_rect(
		rect,
		color.lightened(0.22) if selected else Color(0.53, 0.63, 0.8, 0.45),
		false,
		3 if selected else 1
	)


func _draw_button(rect: Rect2, label: String, color: Color, font_size: float) -> void:
	draw_rect(rect, color, true)
	draw_rect(rect, color.lightened(0.25), false, 2)
	_draw_text(
		label,
		rect.position + Vector2(rect.size.x * 0.5, rect.size.y * 0.5 + font_size * 0.35),
		font_size,
		Color.WHITE,
		HORIZONTAL_ALIGNMENT_CENTER
	)


func _draw_text(text: String, at: Vector2, font_size: float, color: Color, align: int) -> void:
	draw_string(font, at, text, align, -1, font_size, color)


func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch and event.pressed:
		_handle_tap(event.position)
	elif (
		event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT
	):
		_handle_tap(event.position)


func _handle_tap(point: Vector2) -> void:
	var w := size.x
	var s := minf(w / 1280.0, size.y / 720.0)
	if main.mode == 0:
		var card_w := minf(205 * s, w * 0.22)
		var gap := 15 * s
		var start_x := (w - (card_w * 4 + gap * 3)) * 0.5
		var card_y := size.y * 0.31
		for i in range(4):
			var rect := Rect2(start_x + i * (card_w + gap), card_y, card_w, 190 * s)
			if rect.has_point(point):
				main.selected[main.picking_player] = i
				queue_redraw()
				return
		if Rect2(w * 0.5 - 150 * s, size.y * 0.68, 145 * s, 48 * s).has_point(point):
			main.picking_player = 1 - main.picking_player
			queue_redraw()
			return
		if Rect2(w * 0.5 + 8 * s, size.y * 0.68, 175 * s, 48 * s).has_point(point):
			main.start_match()
			return
		if Rect2(w * 0.5 - 100 * s, size.y * 0.77, 200 * s, 38 * s).has_point(point):
			main.ai_mode = not main.ai_mode
			queue_redraw()
	elif main.mode == 1:
		if Rect2(w - 102 * s, safe_top + 60 * s, 100 * s, 54 * s).has_point(point):
			main.return_to_select()
	elif main.mode == 2:
		if Rect2(w * 0.5 - 200, size.y * 0.58, 180, 55).has_point(point):
			main.start_match()
		elif Rect2(w * 0.5 + 20, size.y * 0.58, 180, 55).has_point(point):
			main.return_to_select()
