-- Import the v1 recipe list into the v2 library (one-off, guarded).
-- Owner and partner accounts are resolved by email at apply time (placeholders
-- below; this one-off has already been applied to the shared project).
do $$
declare
  hh uuid;
  peter_user uuid;
  megan_user uuid;
  m_peter uuid; m_megan uuid; m_jamie uuid;
  mr uuid;  -- "Mince & Rice" family
  r record;
  new_meal uuid;
  var_id uuid;
begin
  if exists (select 1 from forkcast.households) then
    raise notice 'household exists, skipping import';
    return;
  end if;

  select id into peter_user from auth.users where email = '<owner-email>';
  select id into megan_user from auth.users where email = '<partner-email>';
  if peter_user is null then raise exception 'owner account not found'; end if;

  insert into forkcast.households (name, cycle_length_days, default_servings)
    values ('Our household', 14, 5) returning id into hh;

  insert into forkcast.household_users (household_id, user_id, role) values (hh, peter_user, 'owner');
  if megan_user is not null then
    insert into forkcast.household_users (household_id, user_id, role) values (hh, megan_user, 'member');
  end if;

  insert into forkcast.members (household_id, name, user_id, is_cook, colour, sort_order)
    values (hh, 'Peter', peter_user, true, '#2f7d5b', 0) returning id into m_peter;
  insert into forkcast.members (household_id, name, user_id, is_cook, colour, sort_order)
    values (hh, 'Megan', megan_user, true, '#b5552b', 1) returning id into m_megan;
  insert into forkcast.members (household_id, name, is_cook, colour, sort_order)
    values (hh, 'Jamie', true, '#5b5fc7', 2) returning id into m_jamie;
  -- Placeholders: rename in Settings.
  insert into forkcast.members (household_id, name, is_cook, colour, sort_order) values
    (hh, 'Kid 2', false, '#c18a12', 3),
    (hh, 'Kid 3', false, '#a43f7a', 4);

  -- Mince & Rice: three v1 recipes become one meal with variations.
  insert into forkcast.meals (household_id, name, kind, cuisine, protein, effort, tags,
      target_interval_days, servings, batch_friendly, notes, method, created_by)
  values (hh, 'Mince & Rice', 'head', null, 'beef', 'medium', '{kid-friendly}',
      14, 4, false,
      'One-pot mince and rice. Same method each time, different spice profile.',
      (select method from forkcast_v1.recipes where name = 'Moroccan Mince & Rice' limit 1),
      peter_user)
  returning id into mr;
  insert into forkcast.meal_cooks (household_id, meal_id, member_id) values (hh, mr, m_peter);

  for r in
    select * from forkcast_v1.recipes
    where name <> 'Bulgogi'  -- duplicate of Korean Bulgogi
    order by name
  loop
    var_id := null;

    if r.name like '% Mince & Rice' then
      new_meal := mr;
      insert into forkcast.meal_variations (household_id, meal_id, name, notes, method, legacy_id, sort_order)
        values (hh, mr, replace(r.name, ' Mince & Rice', ''), r.notes,
                case when r.name = 'Moroccan Mince & Rice' then null else r.method end, r.id,
                case replace(r.name, ' Mince & Rice', '') when 'Moroccan' then 0 when 'Indian' then 1 else 2 end)
        returning id into var_id;
    else
      insert into forkcast.meals (
        household_id, name, kind, course, notes, method, cuisine, protein, effort, tags,
        target_interval_days, servings, weeknight_ok, batch_friendly, fresh_heavy,
        source_url, source_name, needs_recipe, legacy_id, created_by)
      values (
        hh,
        case r.name when 'Korean Bulgogi' then 'Bulgogi' else r.name end,
        case when r.source_url is not null then 'recipe' else 'head' end,
        case r.name when 'Yellow Rice' then 'side' when 'Pumpkin Pie' then 'dessert' else 'main' end,
        r.notes, r.method,
        case when r.cuisine in ('Chicken','Soup','Flexible','Stew','Roast','Side/Main','Seafood',
                                'Dessert','Side','Takeaway-style') then null else r.cuisine end,
        case
          when r.name ~* 'falafel|shakshuka|tomato soup|pumpkin soup|minestrone|french onion|risotto|baked potato|tabbouleh|corn \+ avo|breakfast|pumpkin pie|yellow rice' then 'vegetarian'
          when r.name ~* 'salmon|fish' then 'fish'
          when r.name ~* 'chicken|katsu|chick' then 'chicken'
          when r.name ~* 'lamb|moussaka|kofta' then 'lamb'
          when r.name ~* 'pork|sausage|gyoza|chorizo|carbonara' then 'pork'
          when r.name ~* 'beef|mince|bolog|lasagn|bulgogi|rendang|stew|bourguignon|burger|meatball|pie|pad see ew|pho|shepherd|nacho|taco|burrito|enchilada|fajita|quesadilla|potato bake' then 'beef'
          else null
        end,
        case when 'quick' = any(r.tags) then 'quick'
             when 'weekend-cook' = any(r.tags) then 'project'
             else 'medium' end,
        array(select t from unnest(r.tags) t
              where t not in ('quick','weekend-cook','megan-friendly','jamie-friendly')),
        case when r.name in ('Yellow Rice','Pumpkin Pie') then null
             when r.is_favourite then 21 else 42 end,
        coalesce(r.servings, 4),
        not ('weekend-cook' = any(r.tags)),
        r.name ~* 'bolognaise|lasagn|stew|bourguignon|rendang|curry|soup|pulled pork|kofta|coq au vin|minestrone|red braised',
        r.name ~* 'tabbouleh|fish|falafel|sushi|corn \+ avo|kofta|salmon',
        r.source_url,
        case when r.source_url ilike '%recipetineats%' then 'RecipeTin Eats' else null end,
        coalesce(r.needs_recipe, false),
        r.id,
        peter_user)
      returning id into new_meal;

      if r.cooked_by = 'peter' then
        insert into forkcast.meal_cooks (household_id, meal_id, member_id) values (hh, new_meal, m_peter);
      elsif r.cooked_by = 'megan' then
        insert into forkcast.meal_cooks (household_id, meal_id, member_id) values (hh, new_meal, m_megan);
      elsif r.cooked_by = 'jamie' then
        insert into forkcast.meal_cooks (household_id, meal_id, member_id) values (hh, new_meal, m_jamie);
      end if;
    end if;

    insert into forkcast.meal_ingredients (household_id, meal_id, variation_id, name, quantity, unit, note, optional, section, sort_order)
    select hh, new_meal, var_id,
      i->>'name',
      case when (i->>'qty') ~ '^[0-9.]+$' and (i->>'qty')::numeric > 0 then (i->>'qty')::numeric end,
      case when lower(i->>'unit') in ('g','kg','ml','l','tbsp','tsp','cup','cups','cloves','tin','pkt','large')
           then case lower(i->>'unit') when 'cups' then 'cup' else lower(i->>'unit') end end,
      case when lower(coalesce(i->>'unit','')) not in ('','g','kg','ml','l','tbsp','tsp','cup','cups','cloves','tin','pkt','large','optional')
           then i->>'unit' end,
      lower(coalesce(i->>'unit','')) = 'optional',
      case i->>'category'
        when 'Produce' then 'produce'
        when 'Meat & Fish' then 'meat_seafood'
        when 'Dairy & Eggs' then 'dairy_eggs'
        when 'Frozen' then 'frozen'
        when 'Pantry' then 'pantry'
        else 'other' end,
      (ord - 1)::smallint
    from jsonb_array_elements(coalesce(r.ingredients, '[]'::jsonb)) with ordinality as e(i, ord);
  end loop;

  -- Pantry starter set.
  insert into forkcast.pantry_items (household_id, name, tier, section) values
    (hh, 'Salt', 'always', 'pantry'),
    (hh, 'Black pepper', 'always', 'pantry'),
    (hh, 'Olive oil', 'always', 'pantry'),
    (hh, 'Canola oil', 'always', 'pantry'),
    (hh, 'Cooking oil', 'always', 'pantry'),
    (hh, 'Flour', 'always', 'pantry'),
    (hh, 'Sugar', 'always', 'pantry'),
    (hh, 'Lemon', 'always', 'produce'),        -- lemon tree
    (hh, 'Rosemary', 'always', 'produce'),     -- garden
    (hh, 'Thyme', 'always', 'produce'),        -- garden
    (hh, 'Rice', 'usually', 'pantry'),
    (hh, 'Garlic', 'usually', 'produce'),
    (hh, 'Onion', 'usually', 'produce'),
    (hh, 'Soy sauce', 'usually', 'pantry'),
    (hh, 'Butter', 'usually', 'dairy_eggs'),
    (hh, 'Chicken stock', 'usually', 'pantry'),
    (hh, 'Beef stock', 'usually', 'pantry'),
    (hh, 'Milk', 'regular', 'dairy_eggs'),
    (hh, 'Bread', 'regular', 'bakery');
end $$;
