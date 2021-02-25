import re
from settlers.models import Settlers
for gm in Settlers.objects.all():
    game = gm.game
    if 'init' in game:
        print(game['init']['harbors'], "=>")
        game['harbors'] = {
            f'{h["hex"]}{h["edge"]}': h["resource"]
            for h in game['init']['harbors']
        }
        game['grid'] = [re.findall(r'..', a) for a in re.findall(r'.{14}', game['init']['grid'])]
        game['layout'] = game['init'].get('name', 'standard34')
        if 'isSync' not in game:
            game['isSync'] = False

        del game['init']

        gm.save()
        gm = Settlers.objects.get(id=gm.id)
        print(gm.game['harbors'])

