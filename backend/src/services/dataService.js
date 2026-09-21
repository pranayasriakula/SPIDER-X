const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/apiError');

const database = () => {
  if (!supabaseAdmin) throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase server configuration is unavailable');
  return supabaseAdmin;
};

const getMany = async (table, query = {}, orderColumn = 'created_at') => {
  let request = database().from(table).select('*');
  Object.entries(query).forEach(([key, value]) => { request = request.eq(key, value); });
  const { data, error } = await request.order(orderColumn, { ascending: false });
  if (error) throw new ApiError(500, 'DATABASE_ERROR', error.message);
  return data;
};
const getById = async (table, idColumn, id, code) => {
  const { data, error } = await database().from(table).select('*').eq(idColumn, id).single();
  if (error || !data) throw new ApiError(404, code, 'Resource not found');
  return data;
};
const insert = async (table, values) => {
  const { data, error } = await database().from(table).insert(values).select().single();
  if (error) throw new ApiError(400, 'DATABASE_ERROR', error.message);
  return data;
};
const updateById = async (table, idColumn, id, values, code) => {
  const { data, error } = await database().from(table).update(values).eq(idColumn, id).select().single();
  if (error || !data) throw new ApiError(404, code, 'Resource not found');
  return data;
};

module.exports = { getMany, getById, insert, updateById, database };
