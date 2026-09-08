# Confere a estimativa contra números calculados à mão.
src = open('backend/server.py', encoding='utf-8').read()
start = src.index('WALL_H = 2.7')
end = src.index('@api.post("/estimate")')
class Room:
    def __init__(s, name, width, length, x=0, y=0, floor=0):
        s.name, s.width, s.length, s.x, s.y, s.floor = name, width, length, x, y, floor
    def model_dump(s): return dict(s.__dict__)
ns = {'Room': Room, 'List': list, 'Dict': dict, 'Any': object}
exec(src[start:end], ns)
calc, wall = ns['_compute_estimate'], ns['_wall_area']
falhas = []

# 1) Parede compartilhada conta uma vez só.
dois = [Room('A', 4, 3, 0, 0), Room('B', 4, 3, 4, 0)]      # encostados em x=4
esperado = (4 + 4 + 3 + 4 + 4 + 3 + 3) * 2.7               # 7 trechos, a divisa uma vez
got = wall(dois)
print(f'parede de 2 cômodos encostados: {got} m² (esperado {esperado:.1f})')
if abs(got - esperado) > 0.05: falhas.append('parede compartilhada contada errado')

# 2) O formato muda a alvenaria: mesma área, casas diferentes.
quadrada = [Room('Sala', 8, 8)]
comprida = [Room('Sala', 32, 2)]
print(f'mesma área 64 m² · quadrada {wall(quadrada)} m² de parede · comprida {wall(comprida)} m²')
if wall(comprida) <= wall(quadrada): falhas.append('formato não influencia a alvenaria')

# 3) A composição dos cômodos tem de mudar o custo.
# Planta real: cômodos lado a lado, dividindo paredes, como o app gera.
base = [Room('Sala',5,4,0,0), Room('Cozinha',4,3,5,0), Room('Banheiro',2,2,0,4),
        Room('Quarto',3.5,3,2,4), Room('Corredor',1.2,4,5.5,3)]
mesma = lambda nome: [Room(nome, r.width, r.length, r.x, r.y) for r in base]
t_banho = calc(mesma('Banheiro'), 25, 20)['estimated_total']
t_corr  = calc(mesma('Corredor'), 25, 20)['estimated_total']
t_base  = calc(base, 25, 20)['estimated_total']
print(f'só banheiros R$ {t_banho:,.0f} · casa mista R$ {t_base:,.0f} · só corredores R$ {t_corr:,.0f}')
if not (t_banho > t_base > t_corr): falhas.append('mistura de cômodos não afeta o total')
if abs(t_banho / t_corr - 1.35/0.55) > 0.01: falhas.append('proporção entre tipos errada')

# 4) Conferência do total: soma dos cômodos com multiplicador.
r = calc(base, 25, 20)
mao = sum(x.width*x.length*1900*ns['_room_multiplier'](x.name) for x in base)
print(f"total {r['estimated_total']:,.2f} · calculado à mão {mao:,.2f}")
if abs(r['estimated_total'] - mao) > 0.05: falhas.append('total não bate com a soma manual')
if abs(sum(p['share'] for p in r['per_room']) - 100) > 0.3: falhas.append('percentuais não somam 100')

# 5) Materiais em ordem de grandeza plausível para 51 m².
print(f"\narea {r['area']} m² · paredes {r['wall_area']} m²")
for m in r['materials']:
    print('  %-24s %9s %-7s R$ %10s' % (m['name'], m['quantity'], m['unit'], f"{m['quantity']*m['unit_cost']:,.2f}"))
print(f"materiais R$ {r['materials_total']:,.2f} · obra completa R$ {r['estimated_total']:,.2f} · {r['cost_per_m2']:,.2f}/m²")
cim = next(m for m in r['materials'] if 'Cimento' in m['name'])['quantity']
por_m2 = cim / r['area']
print(f"cimento por m²: {por_m2:.2f} saco (referência de obra: 0,8 a 1,2)")
if not (0.8 <= por_m2 <= 1.25): falhas.append(f'cimento fora da faixa usual: {por_m2:.2f}/m²')
# A lista cobre as compras principais (estrutura, alvenaria, piso, telhado, tinta) e
# não o serviço completo — hidráulica, elétrica, esquadrias e mão de obra ficam de fora,
# então ela fica bem abaixo do total. Só checamos que a ordem de grandeza faz sentido.
frac = r['materials_total']/r['estimated_total']
print(f'lista de materiais = {frac:.0%} do custo total da obra')
if not (0.12 <= frac <= 0.45):
    falhas.append(f'materiais em {frac:.0%} do total — fora de qualquer faixa plausível')

# 6) Dois andares: a área soma e as paredes de cada andar contam.
sobrado = base + [Room('Suíte',5,4,0,0,1), Room('Quarto 2',4,3,5,0,1)]
r2 = calc(sobrado, 25, 20)
print(f"\nsobrado: {r2['area']} m² · paredes {r2['wall_area']} m² · R$ {r2['estimated_total']:,.2f}")
if r2['wall_area'] <= r['wall_area']: falhas.append('andar extra não somou parede')

print()
print('❌ ' + ' | '.join(falhas) if falhas else '✅ todas as verificações passaram')
raise SystemExit(1 if falhas else 0)
