create index if not exists professor_budget_reservations_user_idx
  on public.professor_budget_reservations (user_id, month_start);

drop policy if exists "Learners can read own error bank" on public.user_error_bank;
create policy "Learners can read own error bank"
  on public.user_error_bank for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Learners can read own curriculum recommendations" on public.curriculum_recommendations;
create policy "Learners can read own curriculum recommendations"
  on public.curriculum_recommendations for select
  to authenticated
  using ((select auth.uid()) = user_id);
